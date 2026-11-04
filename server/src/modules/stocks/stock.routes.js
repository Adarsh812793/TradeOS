import express from "express";

import stockController from "./stock.controller.js";

import validate from "../../middleware/validate.middleware.js";
import { stockIdParamSchema } from "./stock.validation.js";
import protect from "../../middleware/auth.middleware.js";

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

// iii. Get specific stock by id
router.get(
    "/:id",
    validate(stockIdParamSchema, "params"),
    stockController.getStockById
);

export default router;