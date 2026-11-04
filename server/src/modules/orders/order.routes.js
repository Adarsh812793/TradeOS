import express from "express";

import orderController from "./order.controller.js";

import protect from "../../middleware/auth.middleware.js";

//Validation
import { OrderSchema } from "./order.validation.js";
import validate from "../../middleware/validate.middleware.js";
import { paginationSchema } from "../../utils/pagination.validation.js";
import asyncWrap from "../../utils/asyncWrap.js";

const router = express.Router();

//i. Purpose:To create a order->PROTECTED ROUTE
router.post(
    "/",
    protect,
    validate(OrderSchema,"body"),
    orderController.createBuyOrder
);

//ii. Pupose: TO create a sell order->PROTECTED ROUTE
router.post(
    "/sell",
    protect,
    validate(OrderSchema,"body"),
    orderController.createSellOrder
);

//ii. To get all the orders of users
router.get(
    "/",
    protect,
    validate(paginationSchema, "query"),
    asyncWrap(orderController.getOrders)
);

export default router;