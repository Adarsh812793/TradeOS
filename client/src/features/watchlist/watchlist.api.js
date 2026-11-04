import api from "../../lib/api.js";

const getUserWatchlist = () => {
  return api.get("/api/watchlist");
};

const addToWatchlist = (stockId) => {
  return api.post("/api/watchlist", { stockId });
};

const removeFromWatchlist = (stockId) => {
  return api.delete(`/api/watchlist/${stockId}`);
};

export default {
  getUserWatchlist,
  addToWatchlist,
  removeFromWatchlist,
};