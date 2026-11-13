import { describe, it, expect, beforeEach } from "vitest";

import Candle from "../src/modules/candles/candle.model.js";
import Stock from "../src/modules/stocks/stock.model.js";
import Transaction from "../src/modules/transactions/transaction.model.js";
import User from "../src/modules/users/user.model.js";
import portfolioService from "../src/modules/portfolio/portfolio.service.js";
import walletService from "../src/modules/wallet/wallet.service.js";
import { getTradingDay, isTradingDay, istMidnight } from "../src/modules/market/market.hours.js";
import { addMoney } from "../src/utils/money.js";
import { request, app, createAuthenticatedUser, createTestStock } from "./helpers/tradeosTestUtils.js";

// Real orders through the API (the market is "always open" in tests), then the history endpoint and service.
// To get a known calendar, the ledger's dates are rewritten afterwards and the service is called with a fixed `now`.
const NOW = new Date("2026-11-13T06:00:00Z"); // Friday 13 Nov 2026, 11:30 IST

const buy = (user, stock, quantity) =>
    request(app).post("/api/orders").set("Authorization", user.authHeader).send({ stockId: String(stock._id), quantity });

const sell = (user, stock, quantity) =>
    request(app).post("/api/orders/sell").set("Authorization", user.authHeader).send({ stockId: String(stock._id), quantity });

const history = (user, query = "") =>
    request(app).get(`/api/portfolio/history${query}`).set("Authorization", user.authHeader);

const userIdOf = async (user) => (await User.findOne({ email: user.email }).select("_id").lean())._id;

// Inserts one daily candle per [IST date, close] pair for a stock
const addCloses = (stock, closes) =>
    Candle.insertMany(
        Object.entries(closes).map(([date, close]) => ({
            stockId: stock._id,
            interval: "1d",
            bucketStart: istMidnight(date),
            open: close,
            high: close,
            low: close,
            close,
            synthetic: false
        }))
    );

// Moves a user's trades (oldest first) to the given instants
async function redateTrades(userId, instants) {
    const trades = await Transaction.find({ userId }).sort({ executedAt: 1, _id: 1 });

    for (const [index, trade] of trades.entries()) {
        trade.executedAt = new Date(instants[index]);
        await trade.save();
    }
}

describe("GET /api/portfolio/history: access and validation", () => {
    it("rejects a request without a token", async () => {
        const response = await request(app).get("/api/portfolio/history");

        expect([401, 403]).toContain(response.status);
    });

    it("rejects a range that is not offered", async () => {
        const user = await createAuthenticatedUser();

        for (const range of ["1D", "2W", "1m", "forever"]) {
            const response = await history(user, `?range=${range}`);

            expect(response.status).toBe(400);
            expect(response.body.errorCode).toBe("VALIDATION_ERROR");
        }
    });

    it("answers a new user with no trades with an empty history and the default range", async () => {
        const user = await createAuthenticatedUser();

        const response = await history(user);

        expect(response.status).toBe(200);
        expect(response.body.data).toEqual({
            range: "1M",
            currency: "INR",
            firstTradeAt: null,
            points: [],
            summary: null
        });
    });

    it("never includes another user's trades", async () => {
        const trader = await createAuthenticatedUser();
        const stranger = await createAuthenticatedUser();
        const stock = await createTestStock(100);

        expect((await buy(trader, stock, 3)).status).toBe(201);

        const response = await history(stranger);

        expect(response.status).toBe(200);
        expect(response.body.data.firstTradeAt).toBeNull();
        expect(response.body.data.points).toEqual([]);
    });
});

describe("GET /api/portfolio/history: real orders", () => {
    it("ends at the wallet balance plus the portfolio value, to the paisa", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(2850.05); // 3 x 2850.05 is the classic floating point trap

        expect((await buy(user, stock, 3)).status).toBe(201);
        expect((await sell(user, stock, 1)).status).toBe(201);

        const response = await history(user, "?range=ALL");
        expect(response.status).toBe(200);

        const { data } = response.body;
        expect(data.firstTradeAt).not.toBeNull();

        // On a weekend (possible only because tests run with the always-open override) there is no point for
        // today, so the check needs a trading day; the next test pins the calendar and always runs
        if (isTradingDay(getTradingDay())) {
            const userId = await userIdOf(user);
            const wallet = await walletService.getWallet(userId);
            const portfolio = await portfolioService.getUserPortfolio(userId);
            const last = data.points.at(-1);

            expect(last.date).toBe(getTradingDay());
            expect(last.cash).toBe(wallet.balance);
            expect(last.holdingsValue).toBe(portfolio.summary.totalCurrentValue);
            expect(last.totalValue).toBe(addMoney(wallet.balance, portfolio.summary.totalCurrentValue));
        }
    });
});

describe("getPortfolioHistory with a known calendar", () => {
    let user;
    let userId;
    let stock;

    // 10 shares at 100, then 5 more at 120, then 3 sold at 130: 12 shares and 98,790 cash in the end
    beforeEach(async () => {
        user = await createAuthenticatedUser();
        userId = await userIdOf(user);
        stock = await createTestStock(100);

        expect((await buy(user, stock, 10)).status).toBe(201);
        await Stock.updateOne({ _id: stock._id }, { currentPrice: 120 });
        expect((await buy(user, stock, 5)).status).toBe(201);
        await Stock.updateOne({ _id: stock._id }, { currentPrice: 130 });
        expect((await sell(user, stock, 3)).status).toBe(201);
        await Stock.updateOne({ _id: stock._id }, { currentPrice: 140 }); // today's price

        await redateTrades(userId, [
            "2026-11-04T05:00:00Z",
            "2026-11-06T05:00:00Z",
            "2026-11-06T06:00:00Z" // the sell, later the same day as the second buy
        ]);
    });

    it("values every trading day from the first trade with that day's close and that evening's holdings", async () => {
        await addCloses(stock, {
            "2026-11-03": 95, "2026-11-04": 100, "2026-11-05": 110, "2026-11-06": 125,
            "2026-11-09": 135, "2026-11-11": 138, "2026-11-12": 139
        });

        const result = await portfolioService.getPortfolioHistory(userId, "ALL", NOW);

        expect(result.firstTradeAt).toBe("2026-11-04T05:00:00.000Z");

        // 10 Nov is a holiday and 7 and 8 Nov a weekend: none of them has a point
        expect(result.points.map((point) => point.date)).toEqual([
            "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-09", "2026-11-11", "2026-11-12", "2026-11-13",
        ]);

        const byDate = Object.fromEntries(result.points.map((point) => [point.date, point]));

        expect(byDate["2026-11-04"]).toMatchObject({ holdingsValue: 1000, cash: 99000, totalValue: 100000 });
        expect(byDate["2026-11-05"]).toMatchObject({ holdingsValue: 1100, cash: 99000, totalValue: 100100 });
        // 6 Nov holds the buy of 5 and the sell of 3 together: 12 shares at the 125 close, 98,790 cash
        expect(byDate["2026-11-06"]).toMatchObject({ holdingsValue: 1500, cash: 98790, totalValue: 100290 });
        expect(byDate["2026-11-13"]).toMatchObject({ holdingsValue: 1680, cash: 98790, totalValue: 100470 });
        expect(result.points.every((point) => point.estimated === false)).toBe(true);

        expect(result.points[0].time).toBe(istMidnight("2026-11-04").toISOString());
        expect(result.summary).toEqual({ startValue: 100000, endValue: 100470, change: 470, changePercent: 0.47 });
    });

    it("makes today's point equal the wallet plus the portfolio value", async () => {
        await addCloses(stock, { "2026-11-04": 100, "2026-11-12": 139 });

        const result = await portfolioService.getPortfolioHistory(userId, "ALL", NOW);
        const wallet = await walletService.getWallet(userId);
        const portfolio = await portfolioService.getUserPortfolio(userId);
        const last = result.points.at(-1);

        expect(last.date).toBe("2026-11-13");
        expect(last.cash).toBe(wallet.balance);
        expect(last.holdingsValue).toBe(portfolio.summary.totalCurrentValue);
        expect(last.totalValue).toBe(addMoney(wallet.balance, portfolio.summary.totalCurrentValue));
    });

    it("cuts the range at its start without changing any value", async () => {
        await addCloses(stock, {
            "2026-11-04": 100, "2026-11-05": 110, "2026-11-06": 125, "2026-11-09": 135,
            "2026-11-11": 138, "2026-11-12": 139
        });

        const all = await portfolioService.getPortfolioHistory(userId, "ALL", NOW);
        const week = await portfolioService.getPortfolioHistory(userId, "1W", NOW);

        // 1W reaches back to 6 Nov
        expect(week.points[0].date).toBe("2026-11-06");
        expect(week.points).toEqual(all.points.filter((point) => point.date >= "2026-11-06"));
        expect(week.range).toBe("1W");
    });

    it("marks a day estimated when the stock has no candle at all yet", async () => {
        // No candles inserted: only today's price (the current price) is known
        const result = await portfolioService.getPortfolioHistory(userId, "ALL", NOW);

        expect(result.points[0]).toMatchObject({ date: "2026-11-04", estimated: true, holdingsValue: 1000 });
        expect(result.points.at(-1)).toMatchObject({ date: "2026-11-13", estimated: false });
    });

    it("keeps the cash but leaves out the value of a stock that has been deleted", async () => {
        await Stock.deleteOne({ _id: stock._id });

        const result = await portfolioService.getPortfolioHistory(userId, "ALL", NOW);

        expect(result.points[0]).toMatchObject({ date: "2026-11-04", holdingsValue: 0, cash: 99000, totalValue: 99000 });
        expect(result.points.at(-1)).toMatchObject({ holdingsValue: 0, cash: 98790, totalValue: 98790 });
    });

    it("is served through the endpoint with the same shape", async () => {
        await addCloses(stock, { "2026-11-04": 100 });

        const response = await history(user, "?range=ALL");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Object.keys(response.body.data).sort()).toEqual(
            ["currency", "firstTradeAt", "points", "range", "summary"]
        );
        expect(Object.keys(response.body.data.points[0]).sort()).toEqual(
            ["cash", "date", "estimated", "holdingsValue", "time", "totalValue"]
        );
    });
});
