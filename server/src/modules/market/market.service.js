
/* 1. Imports */
import config from "../../config/env.js";
import { getSavedFyersTokens,getFyersConnectionStatus } from "./market.token.service.js";
import { MARKET_INDICES } from "./market.constants.js";
import ERROR_CODES from "../../utils/errorCodes.js";

/* 2. Fetch and Normalize a Stock Quote */
export async function getStockQuote(symbol) {


    // 2.1 Retrieve saved FYERS tokens from MongoDB
    const savedTokens = await getSavedFyersTokens();

    const accessToken = savedTokens?.accessToken;
    const expiresAt = savedTokens?.accessTokenExpiresAt;

    // 2.2 Check whether token credentials exist
    if (!accessToken) {
        throw new Error(
            "FYERS access token is missing. Authorize again."
        );
    }

    // 2.3 Ensure expiry metadata exists
    if (!expiresAt) {
        throw new Error(
            "FYERS token expiry is unknown. Authorize again to update token metadata."
        );
    }
 
    // 2.4 Mark the connection when the saved token expires
    if (new Date(expiresAt).getTime() <= Date.now()) {
        await updateFyersConnectionStatus("reauthorization_required");

        const error = new Error(
            "FYERS access token has expired. Please authorize again."
        );

        error.code = ERROR_CODES.FYERS_AUTH_INVALID;
        error.statusCode = 401;

        throw error;
    }

    // 2.5 Request the quote from FYERS
    const quoteUrl = new URL("https://api-t1.fyers.in/data/quotes");
    quoteUrl.searchParams.set("symbols", symbol);

    const response = await fetch(quoteUrl, {
        method: "GET",
        headers: {
            Authorization: `${config.FYERS_APP_ID}:${accessToken}`,
        },
        signal: AbortSignal.timeout(10000),
    });

    const result = await response.json();

    // 2.6 Handle FYERS authentication and API errors
    if (!response.ok || result.s !== "ok") {
        const authErrorCodes = [-8, -15, -16, -17];
        const errorCode = Number(result.code);

        if (
            response.status === 401 ||
            authErrorCodes.includes(errorCode)
        ) {
            await updateFyersConnectionStatus("reauthorization_required");

            const error = new Error(
                "FYERS access token is invalid or expired. Please authorize again."
            );

            error.code = ERROR_CODES.FYERS_AUTH_INVALID;
            error.statusCode = 401;

            throw error;
        }
    }


    // 2.7 Extract the quote data
    const quote = result.d?.[0]?.v;

    if (!quote || typeof quote.lp !== "number") {
        throw new Error("FYERS returned an invalid quote.");
    }

    // 2.8 Return only the fields TradeOS needs
    return {
        symbol: quote.symbol,
        lastPrice: quote.lp,
        change: quote.ch,
        changePercent: quote.chp,
        dayHigh: quote.high_price,
        dayLow: quote.low_price,
        openPrice: quote.open_price,
        previousClose: quote.prev_close_price,
        volume: quote.volume,
        currency: "INR",
        quoteTimestamp:
        Number.isFinite(Number(quote.tt)) && Number(quote.tt) > 0
            ? Number(quote.tt)
            : null,
    };
}


/* 3. Fetch Multiple Stock Quotes */
export async function getStockQuotes(symbols) {
    // 3.1 Fetch quotes for all requested symbols
    const results = await Promise.allSettled(
        symbols.map((symbol) =>
            getStockQuote(`NSE:${symbol}-EQ`)
        )
    );

    // 3.2 Separate successful quotes from failed requests
    const quotes = [];
    const errors = [];

    results.forEach((result, index) => {
        if (result.status === "fulfilled") {
            quotes.push(result.value);
        } else {
            errors.push({
                symbol: symbols[index],
                message: result.reason?.message
                    || "Failed to fetch quote.",
            });
        }
    });

    // 3.3 Return successful quotes and per-symbol errors
    return { quotes, errors };
}


/* 4. Fetch Market Indices */
export async function getMarketIndices() {
    // 4.1 Fetch the configured index quotes concurrently
    const indices = Object.values(MARKET_INDICES);

    const results = await Promise.allSettled(
        indices.map((index) => getStockQuote(index.symbol))
    );

    // 4.2 Normalize successful results and collect failures
    const data = [];
    const errors = [];

    results.forEach((result, index) => {
        const marketIndex = indices[index];

        if (result.status === "fulfilled") {
            data.push({
                name: marketIndex.name,
                exchange: marketIndex.exchange,
                ...result.value,
            });
        } else {
            errors.push({
                name: marketIndex.name,
                symbol: marketIndex.symbol,
                message: result.reason?.message
                    || "Failed to fetch index quote.",
            });
        }
    });

    // 4.3 Return both successful data and errors
    return { indices: data, errors };
}
