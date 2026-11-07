//All data needed for dashboard page using exiting backend api's
import api from "../../lib/api.js";

// 1. Account summary data
export const getWallet = () => {
  return api.get("/api/wallet");
};

export const getPortfolio = () => {
  return api.get("/api/portfolio");
};

// 2. Recent activity
export const getRecentOrders = () => {
  return api.get("/api/orders?page=1&limit=5");
};

export const getRecentTransactions = () => {
  return api.get("/api/transactions?page=1&limit=5");
};

// 3. Watchlist preview
export const getWatchlist = () => {
  return api.get("/api/watchlist");
};

/* 4. Fetch Market Indices (defined once in the market feature, shared with the top bar's market strip) */
export { getMarketIndices } from "../market/market.api.js";
