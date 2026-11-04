import Stock from "./stock.model.js";
import Holding from "../holdings/holding.model.js";
import Order from "../orders/order.model.js";

import AppError from "../../utils/AppError.js";
import ERROR_CODES from "../../utils/errorCodes.js";



// I. Gets all stock data from db
const getAllStocks = async () => {

    const stocks = await Stock.find({
        isActive: true
    }).sort({
        symbol: 1
    });

    return stocks;
};


// II. Gets stock having specific id
const getStockById = async (stockId) => {

    const stock = await Stock.findOne({
        _id: stockId,
        isActive: true
    });

    if (!stock) {
        throw new AppError("Stock not found",404,ERROR_CODES.STOCK_NOT_FOUND);
    }

    return stock;
};

// III. Gets user's position and recent orders for a stock
const getStockPosition = async (stockId, userId) => {
    const stock = await getStockById(stockId);

    const [holding, recentOrders] = await Promise.all([
        Holding.findOne({
            userId,
            stockId
        }),

        Order.find({
            userId,
            stockId
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .select("type quantity price totalValue status rejectionReason createdAt")
    ]);

    const quantity = holding?.quantity || 0;
    const averageBuyPrice = holding?.averageBuyPrice || 0;
    const currentPrice = stock.currentPrice;

    const investedValue = quantity * averageBuyPrice;
    const currentValue = quantity * currentPrice;
    const profitLoss = currentValue - investedValue;

    const profitLossPercentage = investedValue > 0
        ? (profitLoss / investedValue) * 100
        : 0;

    return {
        position: {
            quantity,
            averageBuyPrice,
            currentPrice,
            investedValue,
            currentValue,
            profitLoss,
            profitLossPercentage
        },

        recentOrders
    };
};


export default {
    getAllStocks,
    getStockById,
    getStockPosition
};