import Holding from "../holdings/holding.model.js";
import AppError from "../../utils/AppError.js";
import { lineTotal, roundMoney, subtractMoney, sumMoney } from "../../utils/money.js";

const getUserPortfolio = async (userId) => {

    const userHoldings = await Holding.find({ userId })
        .populate(
            "stockId",
            "symbol companyName exchange currentPrice currency"
        );

    // populate() gives null if the stock no longer exists, which would crash the calculations below
    const holdings = userHoldings.filter((holding) => holding.stockId);

    const portfolio = holdings.map((holding) => {

        const quantity = holding.quantity;
        const averageBuyPrice = holding.averageBuyPrice;
        const currentPrice = holding.stockId.currentPrice;

        // Each row is rounded to paise, and the totals below add those rounded rows, so the screen always adds up
        const investedValue = roundMoney(quantity * averageBuyPrice);
        const currentValue = lineTotal(currentPrice, quantity);

        const unrealizedPnL = subtractMoney(currentValue, investedValue);

        const pnlPercentage =
            investedValue === 0
                ? 0
                : (unrealizedPnL / investedValue) * 100;

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

    const totalInvestedValue = sumMoney(portfolio.map((row) => row.investedValue));
    const totalCurrentValue = sumMoney(portfolio.map((row) => row.currentValue));

    const totalUnrealizedPnL =
        subtractMoney(totalCurrentValue, totalInvestedValue);

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