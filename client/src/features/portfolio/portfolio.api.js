
import api from "../../lib/api.js";

const PORTFOLIO_BASE_URL = "/api/portfolio";

// Get the user's holdings along with the portfolio summary
export const getPortfolio = () => {
  return api.get(PORTFOLIO_BASE_URL);
};

// Get the account value (holdings + cash) per trading day. range: 1W | 1M | 3M | 1Y | ALL.
// Returns { data: { range, currency, firstTradeAt, points, summary } }.
export const getPortfolioHistory = (range) => {
  return api.get(`${PORTFOLIO_BASE_URL}/history?range=${range}`);
};
