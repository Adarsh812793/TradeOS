import transactionService from "./transaction.service.js";
import asyncWrap from "../../utils/asyncWrap.js";

const getUserTransactions =asyncWrap( async (req, res, next) => {

        const userId = req.user.userId;

        const { page, limit } = req.query;

        const transactions =await transactionService.getUserTransactions(userId,page,limit);

        res.status(200).json({
            success: true,
            message: "Transactions retrieved successfully",
            data: transactions
        });

});

export default {
    getUserTransactions
};