//This file contains reusable parts that is used in server testing
import { expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import Stock from "../../src/modules/stocks/stock.model.js";
import { getLastEmailTo } from "../../src/modules/email/memory.provider.js";

// Signs a user up the way a real person does: start the sign-up, read the 6-digit code from the email (the tests use the
// in-memory email provider, so nothing is really sent) and verify it. Answers the VERIFY response (201 with an access token
// and the user), or, when the sign-up cannot start (invalid details, the email is taken), that refusal itself, so a test
// can assert it. Every test that needs a user goes through here, so the whole suite exercises email verification.
//
// Verifying also LOGS THE PERSON IN (a refresh session). The old direct sign-up never did, and many tests count sessions
// and devices, so by default that sign-up session is ended again with a logout; pass { keepSession: true } to keep it.
export const signUpUser = async ({ name = "TradeOS Test User", email, password = "TestPassword@123", keepSession = false }) => {
    const started = await request(app).post("/api/auth/register/start").send({ name, email, password });

    if (started.status !== 202) return started;

    const code = getLastEmailTo(email).text.match(/\b(\d{6})\b/)[1];

    const verified = await request(app).post("/api/auth/register/verify").send({ email, code });

    if (verified.status === 201 && !keepSession) {
        const cookie = (verified.headers["set-cookie"] ?? []).find((value) => value.startsWith("refreshToken="));

        await request(app).post("/api/auth/logout").set("Cookie", cookie.split(";")[0]);
    }

    return verified;
};

// Creates a user through the real email sign-up and returns their access token. The login that the verified sign-up
// started IS this user's one session (keepSession), so there is no extra login and the user ends up with exactly one
// refresh session, as before the email sign-up existed.
export const createAuthenticatedUser = async () => {
    const uniqueId = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const email = `tradeos-test-${uniqueId}@example.com`;
    const password = "TestPassword@123";

    const signUpResponse = await signUpUser({ name: "TradeOS Test User", email, password, keepSession: true });

    if (signUpResponse.status !== 201) {
        throw new Error(
            `Test user sign-up failed: ${JSON.stringify(signUpResponse.body)}`
        );
    }

    const accessToken = signUpResponse.body.data?.accessToken;

    if (!accessToken) {
        throw new Error("Access token missing from the sign-up response");
    }

    return {
        accessToken,
        email,
        authHeader: `Bearer ${accessToken}`
    };
};

export const createTestStock = async (price = 100) => {
    const symbol = `TST${Date.now()}${Math.floor(Math.random() * 1000)}`;

    return Stock.create({
        symbol,
        companyName: "TradeOS Test Stock",
        exchange: "NSE",
        currentPrice: price,
        currency: "INR",
        isActive: true
    });
};

export const expectSuccessStatus = (status) => {
    expect([200, 201]).toContain(status);
};

export { request, app };
