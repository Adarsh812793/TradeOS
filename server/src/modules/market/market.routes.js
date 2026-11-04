
/* 1. Imports */
import { Router } from "express";
import {
    startFyersLogin,
    handleFyersCallback,
    getMarketQuote,
    getMarketQuotes,
    getMarketIndicesController,
    getFyersConnectionStatusController
} from "./market.controller.js";

/* 2. Market Routes */
const router = Router();

router.get("/fyers/login", startFyersLogin);
router.get("/fyers/callback", handleFyersCallback);
router.get("/quote", getMarketQuote);
router.get("/quotes", getMarketQuotes);
router.get("/indices", getMarketIndicesController);
router.get("/fyers/status",getFyersConnectionStatusController);

export default router;
