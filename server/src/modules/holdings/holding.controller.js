import holdingService from "./holding.service.js";
import asyncWrap from "../../utils/asyncWrap.js";

// i. Get the current user's holdings
const getUserHoldings = asyncWrap(async (req, res, next) => {

        // Identity comes from verified JWT
        const userId = req.user.userId;


        const holdings =
            await holdingService.getUserHoldings(
                userId
            );


        res.status(200).json({
            success: true,
            data: holdings
        });
});


export default {
    getUserHoldings
};