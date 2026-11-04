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

export default {
    getUserPortfolio
};