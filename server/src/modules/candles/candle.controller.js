import candleService from "./candle.service.js";
import asyncWrap from "../../utils/asyncWrap.js";

// Returns the price candles of one stock for the requested chart range
const getCandles = asyncWrap(async (req, res) => {
    const { id } = req.params;
    const { range } = req.query;

    const data = await candleService.getCandles(id, range);

    res.status(200).json({
        success: true,
        message: "Candles retrieved successfully",
        data
    });
});

export default { getCandles };
