import stockService from "./stock.service.js";
import asyncWrap from "../../utils/asyncWrap.js";

// i. Get all stocks
const getAllStocks = asyncWrap(async (req, res, next) => {
        const stocks = await stockService.getAllStocks();

        res.status(200).json({
            success: true,
            data: stocks
        });

});

// ii.Get stock with specific id
const getStockById =asyncWrap( async (req, res, next) => {

        const { id } = req.params;

        const stock = await stockService.getStockById(id);

        res.status(200).json({
            success: true,
            data: stock
        });

});

// III. Get user's position and recent orders for a stock
const getStockPosition = asyncWrap(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    const data = await stockService.getStockPosition(id, userId);

    res.status(200).json({
        success: true,
        data
    });
});


export default {
    getAllStocks,
    getStockById,
    getStockPosition
};