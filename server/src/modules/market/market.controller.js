/* 1. Imports */
import crypto from "node:crypto";
import config from "../../config/env.js";
import { getStockQuote,getStockQuotes,getMarketIndices } from "./market.service.js";
import { isSupportedStock } from "./market.constants.js";
import { saveFyersTokens,updateFyersConnectionStatus,getFyersConnectionStatus } from "./market.token.service.js";

/* 2. Temporary Token Storage — Local Development Only */
let fyersAccessToken = null;

/* 3. Start FYERS Authorization */
export function startFyersLogin(req, res) {
    // 3.1 Generate unpredictable state for this login attempt
    const state = crypto.randomBytes(32).toString("hex");

    // 3.2 Store state in a short-lived, HTTP-only cookie
    res.cookie("fyers_oauth_state", state, {
        httpOnly: true,
        secure: false, // Local HTTP development only
        sameSite: "lax",
        maxAge: 5 * 60 * 1000,
        path: "/api/market/fyers",
    });

    // 3.3 Build the authorization URL
    const authorizationUrl = new URL(
        "https://api-t1.fyers.in/api/v3/generate-authcode"
    );

    authorizationUrl.searchParams.set("client_id", config.FYERS_APP_ID);
    authorizationUrl.searchParams.set(
        "redirect_uri",
        config.FYERS_REDIRECT_URI
    );
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("state", state);

    return res.redirect(authorizationUrl.toString());
}

/* 4. Handle FYERS Callback */
export async function handleFyersCallback(req, res) {
    // 4.1 Read the provider's callback parameters
    const { auth_code: authCode, state, s, code } = req.query;
    const expectedState = req.cookies?.fyers_oauth_state;

    // 4.2 Clear state cookie after the callback arrives
    res.clearCookie("fyers_oauth_state", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/api/market/fyers",
    });

    // 4.3 Verify state before trusting the authorization code
    if (
        typeof state !== "string" ||
        typeof expectedState !== "string" ||
        state.length !== expectedState.length ||
        !crypto.timingSafeEqual(
            Buffer.from(state),
            Buffer.from(expectedState)
        )
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid or expired FYERS authorization state.",
        });
    }

    // 4.4 Reject unsuccessful or incomplete authorization
    if (s !== "ok" || code !== "200" || typeof authCode !== "string") {
        return res.status(400).json({
            success: false,
            message: "FYERS authorization was unsuccessful.",
        });
    }

    try {
        // 4.5 Hash App ID and App Secret as required by FYERS
        const appIdHash = crypto
            .createHash("sha256")
            .update(`${config.FYERS_APP_ID}:${config.FYERS_APP_SECRET}`)
            .digest("hex");

        // 4.6 Exchange authorization code for an access token
        const response = await fetch(
            "https://api-t1.fyers.in/api/v3/validate-authcode",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    grant_type: "authorization_code",
                    appIdHash,
                    code: authCode,
                }),
                signal: AbortSignal.timeout(10000),
            }
        );

        const result = await response.json();

        if (!response.ok || result.s !== "ok" || !result.access_token) {
            return res.status(502).json({
                success: false,
                message: "FYERS could not issue an access token.",
            });
        }

        /* 4.7 Save FYERS Tokens to MongoDB */
        await saveFyersTokens(
            result.access_token,
            result.refresh_token
        );

        // Restore the FYERS connection after successful authorization
        await updateFyersConnectionStatus("connected");

        // Keep the existing in-memory token temporarily
        // until market.service.js is updated in the next step.
        fyersAccessToken = result.access_token;

        return res.status(200).json({
            success: true,
            message: "FYERS authorization completed successfully."
        });
        
        } catch (error) {
            console.error("FYERS authorization failed:", error.message);

            return res.status(502).json({
                success: false,
                message: "Could not complete FYERS authorization or save tokens."
            });
        }
}

/* 5. Internal Accessor for Later Backend Services */
export function getFyersAccessToken() {
    return fyersAccessToken;
}


/* 6. Dynamic Stock Quote */
export async function getMarketQuote(req, res) {
    // 6.1 Read and validate the requested symbol
    const { symbol } = req.query;

    if (typeof symbol !== "string" || !/^[A-Z0-9&_-]{1,20}$/.test(symbol)) {
        return res.status(400).json({
            success: false,
            message: "A valid stock symbol is required.",
        });
    }

    // 6.2 Reject symbols not supported by TradeOS
    if (!isSupportedStock(symbol)) {
        return res.status(400).json({
            success: false,
            message: `Stock symbol '${symbol}' is not currently supported.`,
        });
    }

    // 6.3 Convert the TradeOS symbol to a FYERS NSE symbol
    const fyersSymbol = `NSE:${symbol}-EQ`;

    try {
        // 6.4 Fetch the normalized quote from the market service
        const quote = await getStockQuote(fyersSymbol);

        return res.status(200).json({
            success: true,
            quote,
        });
    } catch (error) {
        return res.status(502).json({
            success: false,
            message: error.message || "Failed to fetch stock quote.",
        });
    }
}


/* 7. Batch Stock Quotes */
export async function getMarketQuotes(req, res) {
    // 7.1 Read and validate the requested symbols
    const { symbols } = req.query;

    if (typeof symbols !== "string" || !symbols.trim()) {
        return res.status(400).json({
            success: false,
            message: "A comma-separated list of stock symbols is required.",
        });
    }

    const requestedSymbols = symbols.split(",").map(
        (symbol) => symbol.trim()
    );

    // 7.2 Validate batch size and duplicate symbols
    if (
        requestedSymbols.length > 10 ||
        requestedSymbols.some((symbol) => !symbol) ||
        new Set(requestedSymbols).size !== requestedSymbols.length
    ) {
        return res.status(400).json({
            success: false,
            message: "Provide 1–10 unique, non-empty stock symbols.",
        });
    }

    // 7.3 Validate each symbol's format and support status
    const invalidSymbols = requestedSymbols.filter(
        (symbol) =>
            !/^[A-Z0-9&_-]{1,20}$/.test(symbol) ||
            !isSupportedStock(symbol)
    );

    if (invalidSymbols.length > 0) {
        return res.status(400).json({
            success: false,
            message: "One or more stock symbols are invalid or unsupported.",
            invalidSymbols,
        });
    }

    try {
        // 7.4 Fetch quotes for the validated symbols
        const { quotes, errors } = await getStockQuotes(requestedSymbols);

        return res.status(200).json({
            success: true,
            count: quotes.length,
            quotes,
            errors,
        });
    } catch {
        return res.status(502).json({
            success: false,
            message: "Failed to fetch stock quotes.",
        });
    }
}


/* 8. Market Indices */
export async function getMarketIndicesController(req, res) {
    try {
        // 8.1 Fetch the latest available index quotes
        const { indices, errors } = await getMarketIndices();

        // 8.2 Return index data and any partial failures
        return res.status(200).json({
            success: true,
            count: indices.length,
            indices,
            errors,
        });
    } catch {
        return res.status(502).json({
            success: false,
            message: "Failed to fetch market indices.",
        });
    }
}


/* 9. Get FYERS Connection Status */
export async function getFyersConnectionStatusController(req, res) {
    try {
        const connectionStatus = await getFyersConnectionStatus();

        return res.status(200).json({
            success: true,
            connectionStatus
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Could not retrieve FYERS connection status."
        });
    }
}


