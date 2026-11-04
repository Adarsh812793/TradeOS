import api from "../../lib/api.js";

const getAllStocks = () => api.get("/api/stocks");

const getStockById = (stockId) => api.get(`/api/stocks/${stockId}`);

const getStockPosition = (stockId) =>
    api.get(`/api/stocks/${stockId}/position`);

export default {
    getAllStocks,
    getStockById,
    getStockPosition
};