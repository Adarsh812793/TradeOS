import Holding from "../holdings/holding.model.js";
import AppError from "../../utils/AppError.js";
const getUserPortfolio = async (userId) => {

    const userHoldings = await Holding.find({ userId })
        .populate(
            "stockId",
            "symbol companyName exchange currentPrice currency"
        );

    // populate() gives null if the stock no longer exists, which would crash the calculations below
    const holdings = userHoldings.filter((holding) => holding.stockId);

    let totalInvestedValue = 0;
    let totalCurrentValue = 0;

    const portfolio = holdings.map((holding) => {

        const quantity = holding.quantity;
        const averageBuyPrice = holding.averageBuyPrice;
        const currentPrice = holding.stockId.currentPrice;

        const investedValue = quantity * averageBuyPrice;
        const currentValue = quantity * currentPrice;

        const unrealizedPnL = currentValue - investedValue;

        const pnlPercentage =
            investedValue === 0
                ? 0
                : (unrealizedPnL / investedValue) * 100;

        totalInvestedValue += investedValue;
        totalCurrentValue += currentValue;

        return {
            stock: holding.stockId,
            quantity,
            averageBuyPrice,
            currentPrice,
            investedValue,
            currentValue,
            unrealizedPnL,
            pnlPercentage
        };
    });

    const totalUnrealizedPnL =
        totalCurrentValue - totalInvestedValue;

    const totalPnLPercentage =
        totalInvestedValue === 0
            ? 0
            : (totalUnrealizedPnL / totalInvestedValue) * 100;

    return {
        holdings: portfolio,
        summary: {
            totalInvestedValue,
            totalCurrentValue,
            totalUnrealizedPnL,
            totalPnLPercentage
        }
    };
};

export default {
    getUserPortfolio
};