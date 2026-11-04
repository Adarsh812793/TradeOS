import watchlistService from "./watchlist.service.js";
import asyncWrap from "../../utils/asyncWrap.js";

const getWatchlist = asyncWrap(async (req, res, next) => {

        const userId = req.user.userId;

        const watchlist =
            await watchlistService.getUserWatchlist(userId);

        res.status(200).json({
            success: true,
            data: watchlist
        });
});


const addToWatchlist = asyncWrap(async (req, res, next) => {

        const userId = req.user.userId;
        const { stockId } = req.body;

        const watchlistEntry =
            await watchlistService.addToWatchlist(
                userId,
                stockId
            );

        res.status(201).json({
            success: true,
            message: "Stock added to watchlist",
            data: watchlistEntry
        });
});


const removeFromWatchlist = asyncWrap(async (req, res, next) => {

        const userId = req.user.userId;
        const { stockId } = req.params;

        await watchlistService.removeFromWatchlist(
            userId,
            stockId
        );

        res.status(200).json({
            success: true,
            message: "Stock removed from watchlist"
        });
});


export default {
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist
};