import Holding from "../holdings/holding.model.js";
import Transaction from "../transactions/transaction.model.js";
import Candle from "../candles/candle.model.js";
import Stock from "../stocks/stock.model.js";
import walletService from "../wallet/wallet.service.js";
import AppError from "../../utils/AppError.js";
import { lineTotal, roundMoney, subtractMoney, sumMoney } from "../../utils/money.js";
import { getTradingDay, istMidnight } from "../market/market.hours.js";
import { listTradingDays, rebuildHistory } from "./portfolio.history.js";

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

const DAY_MS = 24 * 60 * 60 * 1000;

// How many calendar days each chart range reaches back (ALL starts at the first trade instead)
const RANGE_DAYS = { "1W": 7, "1M": 30, "3M": 90, "1Y": 365 };

// Days of candles read before the range starts, so a stock whose first day in the range had no candle (a weekend,
// a holiday, a day the server was off) can still carry its latest earlier close forward
const CANDLE_LOOKBACK_DAYS = 14;

// The user's account value (holdings + cash) at the end of each trading day of the range, rebuilt from the trade
// ledger and the daily candles by walking backwards from today (see portfolio.history.js for the idea).
// Today's holdings value uses the very same prices and money maths as getUserPortfolio, so the newest point equals
// the portfolio page's current value plus the wallet balance to the paisa.
const getPortfolioHistory = async (userId, range = "1M", now = new Date()) => {
    // One read of each source: the ledger, today's portfolio (it also gives the prices) and the wallet
    const [transactions, portfolio, wallet] = await Promise.all([
        Transaction.find({ userId })
            .select("stockId type quantity executionPrice totalValue executedAt")
            .lean(),
        getUserPortfolio(userId),
        walletService.getWallet(userId)
    ]);

    // No trades yet: nothing to chart (the frontend says "appears after your first trade")
    if (transactions.length === 0) {
        return { range, currency: wallet.currency, firstTradeAt: null, points: [], summary: null };
    }

    const firstTradeAt = new Date(Math.min(...transactions.map((item) => item.executedAt.getTime())));
    const today = getTradingDay(now);

    const fromDate =
        range === "ALL"
            ? getTradingDay(firstTradeAt)
            : getTradingDay(new Date(now.getTime() - RANGE_DAYS[range] * DAY_MS));

    const days = listTradingDays(fromDate, today);

    // Every stock the user ever traded or holds, and which of them still exist
    const stockIds = [
        ...new Set([
            ...transactions.map((item) => String(item.stockId)),
            ...portfolio.holdings.map((row) => String(row.stock._id))
        ])
    ];

    const [existingStocks, candles] = await Promise.all([
        Stock.find({ _id: { $in: stockIds } }).select("_id").lean(),
        Candle.find({
            stockId: { $in: stockIds },
            interval: "1d",
            bucketStart: { $gte: new Date(istMidnight(fromDate).getTime() - CANDLE_LOOKBACK_DAYS * DAY_MS) }
        })
            .select("stockId bucketStart close")
            .lean()
    ]);

    // closes[stockId][IST date] = that day's closing price. A daily candle starts at IST midnight, so its IST date
    // is the trading day it belongs to.
    const closes = {};
    for (const candle of candles) {
        const id = String(candle.stockId);
        closes[id] ??= {};
        closes[id][getTradingDay(candle.bucketStart)] = candle.close;
    }

    // Today's close of a held stock is its current price, the same number the portfolio rows were valued at
    for (const row of portfolio.holdings) {
        const id = String(row.stock._id);
        closes[id] ??= {};
        closes[id][today] = row.currentPrice;
    }

    const { points } = rebuildHistory({
        holdings: portfolio.holdings.map((row) => ({ stockId: String(row.stock._id), quantity: row.quantity })),
        cash: wallet.balance,
        transactions,
        closes,
        stockIds: existingStocks.map((stock) => String(stock._id)),
        days
    });

    const shaped = points.map((point) => ({
        ...point,
        time: istMidnight(point.date).toISOString()
    }));

    let summary = null;

    if (shaped.length > 0) {
        const startValue = shaped[0].totalValue;
        const endValue = shaped[shaped.length - 1].totalValue;
        const change = subtractMoney(endValue, startValue);

        summary = {
            startValue,
            endValue,
            change,
            changePercent: startValue === 0 ? 0 : Number(((change / startValue) * 100).toFixed(2))
        };
    }

    return { range, currency: wallet.currency, firstTradeAt: firstTradeAt.toISOString(), points: shaped, summary };
};

export default {
    getUserPortfolio,
    getPortfolioHistory
};