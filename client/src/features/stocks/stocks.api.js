import api from "../../lib/api.js";

const getAllStocks = () => api.get("/api/stocks");

const getStockById = (stockId) => api.get(`/api/stocks/${stockId}`);

const getStockPosition = (stockId) =>
    api.get(`/api/stocks/${stockId}/position`);

// Price candles for the chart. range: 1D | 1W | 1M | 3M | 1Y | ALL. Returns { data: { range, interval, candles } }.
const getCandles = (stockId, range) =>
    api.get(`/api/stocks/${stockId}/candles?range=${range}`);

export default {
    getAllStocks,
    getStockById,
    getStockPosition,
    getCandles
};