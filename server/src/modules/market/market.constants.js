//Supports only few symbols for now

/* 1. Supported NSE Equity Symbols */
export const SUPPORTED_STOCKS = new Set([
    "SBIN",
    "RELIANCE",
    "TCS",
    "INFY",
    "HDFCBANK",
    "ICICIBANK",
    "BHARTIARTL",
    "ITC",
    "TATAMOTORS",
    "LT",
]);

/* 2. Check Whether a Stock Is Supported */
export function isSupportedStock(symbol) {
    return SUPPORTED_STOCKS.has(symbol);
}


/* 3. Supported Market Indices */
export const MARKET_INDICES = {
    NIFTY50: {
        name: "NIFTY 50",
        exchange: "NSE",
        symbol: "NSE:NIFTY50-INDEX",
    },
    SENSEX: {
        name: "SENSEX",
        exchange: "BSE",
        symbol: "BSE:SENSEX-INDEX",
    },
};

