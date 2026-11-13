import express from "express";
import portfolioController from "./portfolio.controller.js";
import protect from "../../middleware/auth.middleware.js";
import validate from "../../middleware/validate.middleware.js";
import { historyQuerySchema } from "./portfolio.validation.js";

const router = express.Router();

router.get(
    "/",
    protect,
    portfolioController.getUserPortfolio
);

// Reads the user's transactions, holdings, wallet and the daily candles of their stocks (writes nothing); returns
// { range, currency, firstTradeAt, points: [{ date, time, holdingsValue, cash, totalValue, estimated }], summary }
router.get(
    "/history",
    protect,
    validate(historyQuerySchema, "query"),
    portfolioController.getPortfolioHistory
);

export default router;
