import api from "../../lib/api.js";

// Fetches NIFTY 50 and SENSEX. Each index has lastPrice, change, changePercent and two honesty fields from the server:
// `stale` (true when FYERS could not be reached and this is an EARLIER quote) and `asOf` (when the quote was fetched).
export const getMarketIndices = () => {
  return api.get("/api/market/indices");
};
