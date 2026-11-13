import portfolioService from "./portfolio.service.js";
import asyncWrap from "../../utils/asyncWrap.js";

const getUserPortfolio = asyncWrap(async (req, res, next) => {
        const userId = req.user.userId;

        const portfolio =await portfolioService.getUserPortfolio(userId);

        res.status(200).json({
            success: true,
            data: portfolio
        });

});

// Returns the user's account value (holdings + cash) per trading day for the requested range
const getPortfolioHistory = asyncWrap(async (req, res) => {
    const history = await portfolioService.getPortfolioHistory(req.user.userId, req.query.range);

    res.status(200).json({
        success: true,
        message: "Portfolio history retrieved successfully",
        data: history
    });
});

export default {
    getUserPortfolio,
    getPortfolioHistory
};