import Transaction from "./transaction.model.js";

import AppError from "../../utils/AppError.js";
 
//i.Function to get transactions of user
const getUserTransactions = async (userId, page, limit) => {

    // Calculate how many documents MongoDB should skip.
    const skip = (page - 1) * limit;

    // Fetch only the transactions required for the current page.
    const transactions = await Transaction.find({ userId })
        .populate(
            "stockId",
            "symbol companyName exchange currentPrice currency"
        )
        .sort({ executedAt: -1 })
        .skip(skip)
        .limit(limit);

    // Count the total number of transactions for this user.
    const totalItems = await Transaction.countDocuments({ userId });

    // Calculate how many pages are available in total.
    const totalPages = Math.ceil(totalItems / limit);

    // Return both the current page data and pagination information.
    return {
        items: transactions,
        pagination: { //metadata for panigation
            page,
            limit,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        }
    };
};

export default {
    getUserTransactions
};