import Holding from "./holding.model.js";

import AppError from "../../utils/AppError.js";

//i. Get user holding 
const getUserHoldings = async (userId) => {

    const holdings = await Holding.find({
        userId
    })
    .populate(
        "stockId",
        "symbol companyName exchange currentPrice currency"
    )
    .sort({
        createdAt: -1
    });

    return holdings;
};


export default {
    getUserHoldings
};