import express from "express";
import portfolioController from "./portfolio.controller.js";
import protect from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get(
    "/",
    protect,
    portfolioController.getUserPortfolio
);

export default router;