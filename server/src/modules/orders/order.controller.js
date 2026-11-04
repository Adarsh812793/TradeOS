import orderService from "./order.service.js";
import asyncWrap from "../../utils/asyncWrap.js";

//i. Create Buy order
const createBuyOrder = asyncWrap(async (req, res, next) => {

        const userId = req.user.userId;

        const {
            stockId,
            quantity
        } = req.body;


        const result =
            await orderService.createBuyOrder({
                userId,
                stockId,
                quantity
            });


        res.status(201).json({
            success: true,
            message: "Buy order executed successfully",
            data: result
        });

});

// ii. Create sell order
const createSellOrder = asyncWrap(async (req, res, next) => {
        const userId = req.user.userId;

        const {
            stockId,
            quantity
        } = req.body;


        const result =
            await orderService.createSellOrder({
                userId,
                stockId,
                quantity
            });


        res.status(201).json({
            success: true,
            message: "Sell order executed successfully",
            data: result
        });

});

//iii. Function to get all orders
const getOrders = async (req, res) => {

    // Get validated pagination values from the query parameters.
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 8;

    // Pass user ID and pagination values to the service layer.
    const result = await orderService.getUserOrders(
        req.user.userId,
        page,
        limit
    );

    // Send the paginated orders to the client.
    res.status(200).json({
        success: true,
        message: "Orders retrieved successfully",
        data: result
    });
};

export default {
    createBuyOrder,
    createSellOrder,
    getOrders
};