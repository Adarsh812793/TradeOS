
/* 1. Imports */
import { Router } from "express";
import {
    startFyersLogin,
    handleFyersCallback,
    getMarketQuote,
    getMarketQuotes,
    getMarketIndicesController,
    getFyersConnectionStatusController,
    getMarketStatusController
} from "./market.controller.js";

/* 2. Market Routes */
const router = Router();

router.get("/fyers/login", startFyersLogin);
router.get("/fyers/callback", handleFyersCallback);
router.get("/quote", getMarketQuote);
router.get("/quotes", getMarketQuotes);
router.get("/indices", getMarketIndicesController);
// Reads the clock and the price source (no database): returns { isOpen, reason, tradingDay, holidayName, nextOpenAt, priceSource, serverTime }
router.get("/status", getMarketStatusController);
router.get("/fyers/status",getFyersConnectionStatusController);

export default router;
