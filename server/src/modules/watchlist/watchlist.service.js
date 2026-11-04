import Watchlist from "./watchlist.model.js";
import Stock from "../stocks/stock.model.js";
import User from "../users/user.model.js";

import AppError from "../../utils/AppError.js";
import ERROR_CODES from "../../utils/errorCodes.js";

//i. To get all the stocks in watchlist
const getUserWatchlist = async (userId) => {

    const watchlist = await Watchlist.find({ userId })
        .populate(
            "stockId",
            "symbol companyName exchange currentPrice currency"
        )
        .sort({ createdAt: -1 });

    return watchlist;
};

//ii.  To add a stock in watchlist
const addToWatchlist = async (userId, stockId) => {

    // A login token outlives a deleted account for up to 15 minutes, so check the user still exists (no orphaned entries)
    const userExists = await User.exists({ _id: userId });

    if (!userExists) {
        throw new AppError("User not found",404,ERROR_CODES.USER_NOT_FOUND);
    }

    const stock = await Stock.findOne({
        _id: stockId,
        isActive: true
    });

    if (!stock) {
        throw new AppError("Stock not found",404,ERROR_CODES.STOCK_NOT_FOUND);
    }

    const existingEntry = await Watchlist.findOne({
        userId,
        stockId
    });

    if (existingEntry) {
        throw new AppError("Stock already exists in watchlist",409,ERROR_CODES.WATCHLIST_DUPLICATE);
    }

    const watchlistEntry = await Watchlist.create({
        userId,
        stockId
    });

    return watchlistEntry;
};

//iii. TO remove stock from watchlist
const removeFromWatchlist = async (userId, stockId) => {

    const result = await Watchlist.findOneAndDelete({
        userId,
        stockId
    });

    if (!result) {
        throw new AppError("Stock not found in watchlist",404,ERROR_CODES.WATCHLIST_ENTRY_NOT_FOUND);
    }

    return result;
};


export default {
    getUserWatchlist,
    addToWatchlist,
    removeFromWatchlist
};