
/* 1. Imports */
import crypto from "node:crypto";
import config from "../src/config/env.js";
import connectDB from "../src//database/connection.js";
import FyersToken from "../src/modules/market/market.model.js";

// Adjust the last two import paths to match your project structure.

/* 2. Validate required credentials */
const required = [
    ["FYERS_APP_ID", config.FYERS_APP_ID],
    ["FYERS_APP_SECRET", config.FYERS_APP_SECRET],
    ["FYERS_PIN", process.env.FYERS_PIN],
];

for (const [name, value] of required) {
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
}

/* 3. Test the refresh endpoint */
async function testFyersRefresh() {
    try {
        await connectDB();

        const savedTokens = await FyersToken.findOne({})
            .select("+refreshToken")
            .lean();

        if (!savedTokens?.refreshToken) {
            throw new Error("No saved FYERS refresh token found.");
        }

        // Generate the SHA-256 hash locally.
        const appIdHash = crypto
            .createHash("sha256")
            .update(
                `${config.FYERS_APP_ID}:${config.FYERS_APP_SECRET}`
            )
            .digest("hex");

        console.log("Sending refresh request to FYERS...");

        const response = await fetch(
            "https://api-t1.fyers.in/api/v3/validate-refresh-token",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    grant_type: "refresh_token",
                    appIdHash,
                    refresh_token: savedTokens.refreshToken,
                    pin: process.env.FYERS_PIN,
                }),
            }
        );

        const result = await response.json();

        // Never print tokens, PINs, or the complete API response.
        console.log("HTTP status:", response.status);
        console.log("FYERS response code:", result.code ?? "Not provided");
        console.log("FYERS message:", result.message ?? "No message");
        console.log(
            "New access token returned:",
            Boolean(result.access_token)
        );
        console.log(
            "New refresh token returned:",
            Boolean(result.refresh_token)
        );

        if (!response.ok || !result.access_token) {
            console.log(
                "Refresh was not confirmed. Keep the existing flow unchanged."
            );
            return;
        }

        console.log(
            "Refresh endpoint returned an access token. " +
            "Next, verify it with a market-data request."
        );
    } catch (error) {
        console.error("Refresh test failed:", error.message);
    } finally {
        await import("mongoose").then(({ default: mongoose }) =>
            mongoose.disconnect()
        );
    }
}

await testFyersRefresh();
