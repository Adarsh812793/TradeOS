
import api from "../../lib/api.js";

const PORTFOLIO_BASE_URL = "/api/portfolio";

// Get the user's holdings along with the portfolio summary
export const getPortfolio = () => {
  return api.get(PORTFOLIO_BASE_URL);
};
