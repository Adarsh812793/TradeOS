import express from "express";

import holdingController from "./holding.controller.js";

import protect from "../../middleware/auth.middleware.js";


const router = express.Router();


//i. Purpose:To get all holdings of user (PROTECTED ROUTE)
router.get(
    "/",
    protect,
    holdingController.getUserHoldings
);


export default router;