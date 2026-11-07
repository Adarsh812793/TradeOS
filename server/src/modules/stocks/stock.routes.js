import express from "express";

import stockController from "./stock.controller.js";

import validate from "../../middleware/validate.middleware.js";
import { stockIdParamSchema } from "./stock.validation.js";
import protect from "../../middleware/auth.middleware.js";
import candleController from "../candles/candle.controller.js";
import { candleQuerySchema } from "../candles/candle.validation.js";

const router = express.Router();

// i. Get all stocks
router.get(
    "/",
    stockController.getAllStocks
);

// ii. Get user's position and recent orders for a stock
router.get(
    "/:id/position",
    validate(stockIdParamSchema, "params"),
    protect,
    stockController.getStockPosition
);

// iii. Get a stock's price candles (reads the candles collection; returns { range, interval, candles: [{ time, open, high, low, close, synthetic }] } oldest first)
router.get(
    "/:id/candles",
    validate(stockIdParamSchema, "params"),
    validate(candleQuerySchema, "query"),
    candleController.getCandles
);

// iv. Get specific stock by id
router.get(
    "/:id",
    validate(stockIdParamSchema, "params"),
    stockController.getStockById
);

export default router;