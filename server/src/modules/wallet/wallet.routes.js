import express from "express";

import walletController from "./wallet.controller.js";

import protect from "../../middleware/auth.middleware.js";


const router = express.Router();

//i. Get wallet details for specific user ->PROTECTED
router.get(
    "/",
    protect,
    walletController.getWallet
);


export default router;