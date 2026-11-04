import express from "express";
import watchlistController from "./watchlist.controller.js";
import protect from "../../middleware/auth.middleware.js";

import validate from "../../middleware/validate.middleware.js";
import { addWatchlistSchema,stockIdParamSchema } from "./watchlist.validation.js";

const router = express.Router();

//i. To show users watchlist
router.get(
    "/",
    protect,
    watchlistController.getWatchlist
);

//ii. TO add a stock to watchlist
router.post(
    "/",
    protect,
    validate(addWatchlistSchema,"body"),
    watchlistController.addToWatchlist
);

//iii. To delete a stock from watchlist
router.delete(
    "/:stockId",
    protect,
    validate(stockIdParamSchema,"params"),
    watchlistController.removeFromWatchlist
);

export default router;