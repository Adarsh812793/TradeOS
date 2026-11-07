import mongoose from "mongoose";

import Order from "./order.model.js";
import Stock from "../stocks/stock.model.js";
import Wallet from "../wallet/wallet.model.js";
import Holding from "../holdings/holding.model.js";
import Transaction from "../transactions/transaction.model.js";
import notificationService from "../notifications/notification.service.js";
import { orderExecutedTemplate, lowBalanceTemplate } from "../notifications/notification.templates.js";
import { LOW_BALANCE_THRESHOLD } from "../notifications/notification.constants.js";

import AppError from "../../utils/AppError.js";
import ERROR_CODES from "../../utils/errorCodes.js";
import { lineTotal, subtractMoney, addMoney, canAfford, roundRate } from "../../utils/money.js";

//i. Service to create a buy order
const createBuyOrder = async ({
    userId,
    stockId,
    quantity
}) => {

    // ==========================================
    // Start MongoDB transaction
    // ==========================================

    const session = await mongoose.startSession();

    try {

        session.startTransaction();


        // ==========================================
        // 1. Validate quantity
        // ==========================================

        if (!Number.isInteger(quantity) || quantity <= 0) {

            throw new AppError(
                "Quantity must be a positive integer",400,ERROR_CODES.INVALID_QUANTITY
            );
        }


        // ==========================================
        // 2. Find stock
        // ==========================================

        const stock = await Stock.findOne({
            _id: stockId,
            isActive: true
        }).session(session);


        if (!stock) {
            throw new AppError("Stock not found",404, ERROR_CODES.STOCK_NOT_FOUND);
        }


        // ==========================================
        // 3. Get user's wallet
        // ==========================================

        const wallet = await Wallet.findOne({
            userId
        }).session(session);


        if (!wallet) {
            throw new AppError("Wallet not found",404,ERROR_CODES.WALLET_NOT_FOUND);
        }


        // ==========================================
        // 4. Calculate total order value
        // ==========================================

        const executionPrice = stock.currentPrice;

        // Exact money: whole-paise maths (see utils/money.js), so totals never carry float dust
        const totalValue =
            lineTotal(executionPrice, quantity);


        // ==========================================
        // 5. Check wallet balance
        // ==========================================

        if (!canAfford(wallet.balance, totalValue)) {

            throw new AppError(
                "Insufficient wallet balance",400,ERROR_CODES.INSUFFICIENT_BALANCE
            );
        }


        // ==========================================
        // 6. Create Order
        // ==========================================

        const [order] = await Order.create(
            [
                {
                    userId,
                    stockId,
                    type: "BUY",
                    quantity,
                    price: executionPrice,
                    totalValue,
                    status: "EXECUTED"
                }
            ],
            {
                session
            }
        );


        // ==========================================
        // 7. Deduct wallet balance
        // ==========================================

        const balanceBeforeBuy = wallet.balance;

        wallet.balance = subtractMoney(wallet.balance, totalValue);

        await wallet.save({
            session
        });


        // ==========================================
        // 8. Find existing holding
        // ==========================================

        let holding = await Holding.findOne({
            userId,
            stockId
        }).session(session);


        if (holding) {

            // ==========================================
            // Existing holding
            // ==========================================

            const oldQuantity = holding.quantity;

            const oldAveragePrice =
                holding.averageBuyPrice;


            const newQuantity =
                oldQuantity + quantity;


            // Weighted average buy price
            const newAveragePrice =
                roundRate(
                    (
                        (oldQuantity * oldAveragePrice) +
                        (quantity * executionPrice)
                    ) / newQuantity
                );


            holding.quantity = newQuantity;

            holding.averageBuyPrice = newAveragePrice;

            await holding.save({
                session
            });

        } else {

            // ==========================================
            // First time buying this stock
            // ==========================================

            [holding] = await Holding.create(
                [
                    {
                        userId,
                        stockId,
                        quantity,
                        averageBuyPrice: executionPrice
                    }
                ],
                {
                    session
                }
            );
        }


        // ==========================================
        // 9. Create Transaction
        // ==========================================

        const [transaction] = await Transaction.create(
            [
                {
                    userId,
                    orderId: order._id,
                    stockId,
                    type: "BUY",
                    quantity,
                    executionPrice,
                    totalValue
                }
            ],
            {
                session
            }
        );


        // ==========================================
        // 10. Create notifications (same transaction: saved together with the order, or not at all)
        // ==========================================

        await notificationService.createNotification(
            userId,
            orderExecutedTemplate({
                orderType: "BUY",
                symbol: stock.symbol,
                quantity,
                price: executionPrice,
                totalValue,
                orderId: order._id,
                stockId
            }),
            { session }
        );

        // Only when this buy moves the balance from at/above the threshold to below it (no repeat spam)
        if (
            balanceBeforeBuy >= LOW_BALANCE_THRESHOLD &&
            wallet.balance < LOW_BALANCE_THRESHOLD
        ) {
            await notificationService.createNotification(
                userId,
                lowBalanceTemplate({ balance: wallet.balance }),
                { session }
            );
        }


        // ==========================================
        // 11. Commit everything
        // ==========================================

        await session.commitTransaction();


        return {
            order,
            holding,
            transaction,
            walletBalance: wallet.balance
        };


    } catch (error) {

        // ==========================================
        // Something failed
        // Roll everything back
        // ==========================================

        await session.abortTransaction();

        throw error;

    } finally {

        await session.endSession();
    }
};

//ii. Service to sell the stock
const createSellOrder = async ({
    userId,
    stockId,
    quantity
}) => {

    // ==========================================
    // Start MongoDB transaction
    // ==========================================

    const session = await mongoose.startSession();

    try {

        session.startTransaction();


        // ==========================================
        // 1. Validate quantity
        // ==========================================

        if (!Number.isInteger(quantity) || quantity <= 0) {

            throw new AppError(
                "Quantity must be a positive integer",400,ERROR_CODES.INVALID_QUANTITY
            );
        }


        // ==========================================
        // 2. Find stock
        // ==========================================

        const stock = await Stock.findOne({
            _id: stockId,
            isActive: true
        }).session(session);


        if (!stock) {
            throw new AppError("Stock not found",404,ERROR_CODES.STOCK_NOT_FOUND);
        }


        // ==========================================
        // 3. Find user's holding
        // ==========================================

        const holding = await Holding.findOne({
            userId,
            stockId
        }).session(session);


        if (!holding) {

            throw new AppError(
                "You do not own this stock",400,ERROR_CODES.INSUFFICIENT_HOLDINGS
            );
        }


        // ==========================================
        // 4. Check whether user owns enough shares
        // ==========================================

        if (holding.quantity < quantity) {

            throw new AppError(
                "Insufficient stock quantity",400,ERROR_CODES.INSUFFICIENT_HOLDINGS
            );
        }


        // ==========================================
        // 5. Calculate sale value
        // ==========================================

        const executionPrice = stock.currentPrice;

        // Exact money: whole-paise maths (see utils/money.js), so totals never carry float dust
        const totalValue =
            lineTotal(executionPrice, quantity);


        // ==========================================
        // 6. Create SELL order
        // ==========================================

        const [order] = await Order.create(
            [
                {
                    userId,
                    stockId,
                    type: "SELL",
                    quantity,
                    price: executionPrice,
                    totalValue,
                    status: "EXECUTED"
                }
            ],
            {
                session
            }
        );


        // ==========================================
        // 7. Reduce holding
        // ==========================================

        holding.quantity -= quantity;


        // If user sold everything,
        // remove the holding completely.

        if (holding.quantity === 0) {

            await Holding.deleteOne(
                {
                    _id: holding._id
                },
                {
                    session
                }
            );

        } else {

            await holding.save({
                session
            });
        }


        // ==========================================
        // 8. Add sale proceeds to wallet
        // ==========================================

        const wallet = await Wallet.findOne({
            userId
        }).session(session);


        if (!wallet) {
            throw new AppError("Wallet not found",404);
        }


        wallet.balance = addMoney(wallet.balance, totalValue);

        await wallet.save({
            session
        });


        // ==========================================
        // 9. Create transaction
        // ==========================================

        const [transaction] = await Transaction.create(
            [
                {
                    userId,
                    orderId: order._id,
                    stockId,
                    type: "SELL",
                    quantity,
                    executionPrice,
                    totalValue
                }
            ],
            {
                session
            }
        );


        // ==========================================
        // 10. Create notification (same transaction: saved together with the order, or not at all)
        // ==========================================

        await notificationService.createNotification(
            userId,
            orderExecutedTemplate({
                orderType: "SELL",
                symbol: stock.symbol,
                quantity,
                price: executionPrice,
                totalValue,
                orderId: order._id,
                stockId
            }),
            { session }
        );


        // ==========================================
        // 11. Commit transaction
        // ==========================================

        await session.commitTransaction();


        return {
            order,
            holding: holding.quantity === 0
                ? null
                : holding,
            transaction,
            walletBalance: wallet.balance
        };


    } catch (error) {

        // ==========================================
        // Roll everything back
        // ==========================================

        await session.abortTransaction();

        throw error;

    } finally {

        await session.endSession();
    }
};

//iii. Function to get all user orders
const getUserOrders = async (userId, page, limit) => {

    // Calculate how many orders should be skipped.
    const skip = (page - 1) * limit;

    // Fetch only the orders required for the current page.
    const orders = await Order.find({ userId })
        .populate(
            "stockId",
            "symbol companyName exchange currentPrice currency"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    // Count all orders belonging to this user.
    const totalItems = await Order.countDocuments({ userId });

    // Calculate the total number of pages.
    const totalPages = Math.ceil(totalItems / limit);

    // Return the orders along with pagination metadata.
    return {
        items: orders,
        pagination: {
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
    createBuyOrder,
    createSellOrder,
    getUserOrders
};