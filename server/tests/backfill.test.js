import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import mongoose from "mongoose";
import Stock from "../src/modules/stocks/stock.model.js";
import Candle from "../src/modules/candles/candle.model.js";
import { planHistory, runBackfill, assertSnapshotsMatch } from "../scripts/backfill-market-history.js";
import { getTradingDay } from "../src/modules/market/market.hours.js";
import { createAuthenticatedUser, createTestStock } from "./helpers/tradeosTestUtils.js";
import { toPaise } from "../src/utils/money.js";

const MONDAY = new Date("2026-11-09T05:00:00Z"); // Mon 9 Nov 2026, 10:30 IST: the history ends on Friday 6 Nov
const DAY = 24 * 60 * 60 * 1000;
const fakeStock = { symbol: "TESTSYM", currentPrice: 1234.5 };

describe("planHistory (pure maths, no database)", () => {
    const plan = planHistory(fakeStock, { now: MONDAY });

    it("ends exactly at today's price, so the chart joins up with live prices", () => {
        expect(plan.daily.at(-1).close).toBe(1234.5);
    });

    it("covers a year of trading days only: no weekends, no holidays, nothing from today", () => {
        const days = plan.daily.map((c) => getTradingDay(new Date(c.bucketStart.getTime() + 60000)));

        expect(plan.daily.length).toBeGreaterThan(240);
        expect(plan.daily.length).toBeLessThan(256);
        expect(plan.tradingDay).toBe("2026-11-06");
        expect(days).not.toContain("2026-11-07"); // Saturday
        expect(days).not.toContain("2026-10-20"); // Dussehra
        expect(days).not.toContain("2026-11-09"); // today
        expect(new Set(days).size).toBe(days.length);
    });

    it("has no price gaps: each day opens where the previous day closed (one 15-second step away)", () => {
        for (let i = 1; i < plan.daily.length; i++) {
            const gap = Math.abs(plan.daily[i].open - plan.daily[i - 1].close) / plan.daily[i - 1].close;
            expect(gap).toBeLessThan(0.005);
        }
    });

    it("builds valid candles: low <= open and close <= high, prices in 5-paise steps", () => {
        for (const c of [...plan.daily, ...plan.fiveMinute]) {
            expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
            expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
            for (const value of [c.open, c.high, c.low, c.close]) expect(toPaise(value) % 5).toBe(0);
        }
    });

    it("makes 5-minute candles only for the last 14 calendar days, each expiring 14 days after it starts", () => {
        const oldest = Math.min(...plan.fiveMinute.map((c) => c.bucketStart.getTime()));

        expect(oldest).toBeGreaterThanOrEqual(MONDAY.getTime() - 14 * DAY);
        // 10 trading days (26 Oct to 6 Nov) x 75 candles, minus the 15 candles of 26 Oct before the 10:30 cutoff
        expect(plan.fiveMinute).toHaveLength(10 * 75 - 15);
        plan.fiveMinute.forEach((c) => expect(c.expireAt.getTime()).toBe(c.bucketStart.getTime() + 14 * DAY));
    });

    it("agrees with itself: a day's daily high equals the highest of its 5-minute highs", () => {
        const lastDay = plan.daily.at(-1);
        const dayCandles = plan.fiveMinute.filter((c) => c.bucketStart.getTime() >= lastDay.bucketStart.getTime());

        expect(dayCandles).toHaveLength(75);
        expect(Math.max(...dayCandles.map((c) => c.high))).toBe(lastDay.high);
        expect(Math.min(...dayCandles.map((c) => c.low))).toBe(lastDay.low);
        expect(dayCandles[0].open).toBe(lastDay.open);
        expect(dayCandles.at(-1).close).toBe(lastDay.close);
    });

    it("sets previousClose to the close of the day before the last one", () => {
        expect(plan.previousClose).toBe(plan.daily.at(-2).close);
    });

    it("is repeatable: the same stock always gives the same history (so a dry run shows what apply writes)", () => {
        expect(planHistory(fakeStock, { now: MONDAY })).toEqual(plan);
        expect(planHistory({ ...fakeStock, symbol: "OTHER" }, { now: MONDAY })).not.toEqual(plan);
    });
});

describe("runBackfill against the database", () => {
    const created = [];
    const makeStocks = async (n = 2) => {
        const stocks = await Promise.all(Array.from({ length: n }, () => createTestStock(500)));
        created.push(...stocks);
        return stocks;
    };
    const only = (stocks) => ({ _id: { $in: stocks.map((s) => s._id) } });
    const candleCount = (stocks) => Candle.countDocuments({ stockId: { $in: stocks.map((s) => s._id) } });

    afterEach(() => { created.length = 0; });

    it("a dry run (the default) writes nothing, but reports the plan", async () => {
        const stocks = await makeStocks();

        const report = await runBackfill({ filter: only(stocks), checkUserData: false });

        expect(report.apply).toBe(false);
        expect(report.stocks).toHaveLength(2);
        expect(report.stocks[0].dailyCandles).toBeGreaterThan(240);
        expect(await candleCount(stocks)).toBe(0);
        expect((await Stock.findById(stocks[0]._id)).previousClose).toBeNull();
    });

    it("refuses to write without the exact database name", async () => {
        const stocks = await makeStocks(1);

        await expect(runBackfill({ apply: true, filter: only(stocks), checkUserData: false })).rejects.toThrow(/confirm-db/);
        await expect(runBackfill({ apply: true, confirmDb: "some_other_db", filter: only(stocks), checkUserData: false })).rejects.toThrow(/confirm-db/);
        expect(await candleCount(stocks)).toBe(0);
    });

    it("refuses to run in production", async () => {
        const original = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";
        try {
            await expect(runBackfill({ confirmDb: mongoose.connection.name })).rejects.toThrow(/production/);
        } finally {
            process.env.NODE_ENV = original;
        }
    });

    it("with --apply it inserts history, fills previousClose and tradingDay, and leaves currentPrice alone", async () => {
        const stocks = await makeStocks();

        const report = await runBackfill({ apply: true, confirmDb: mongoose.connection.name, filter: only(stocks), checkUserData: false });
        const after = await Stock.findById(stocks[0]._id);

        // the report is sorted by symbol, so find this stock's entry by name, not by position
        const planned = report.stocks.find((entry) => entry.symbol === stocks[0].symbol);
        expect(await Candle.countDocuments({ stockId: stocks[0]._id, interval: "1d" })).toBe(planned.dailyCandles);
        expect(await Candle.countDocuments({ stockId: stocks[0]._id, interval: "5m" })).toBe(planned.fiveMinuteCandles);
        expect(await Candle.countDocuments({ stockId: stocks[0]._id, synthetic: true })).toBeGreaterThan(0);
        expect(after.currentPrice).toBe(500);
        expect(after.previousClose).toBe(planned.previousClose);
        expect(after.tradingDay).toBe(planned.tradingDay);
    });

    it("is idempotent: running it again changes nothing", async () => {
        const stocks = await makeStocks();
        const options = { apply: true, confirmDb: mongoose.connection.name, filter: only(stocks), checkUserData: false };

        await runBackfill(options);
        const countAfterFirst = await candleCount(stocks);
        const stockAfterFirst = await Stock.findById(stocks[0]._id).lean();

        const second = await runBackfill(options);

        expect(second.stocks.every((s) => s.skipped === "already has candles")).toBe(true);
        expect(await candleCount(stocks)).toBe(countAfterFirst);
        expect(await Stock.findById(stocks[0]._id).lean()).toEqual(stockAfterFirst);
    });

    it("never overwrites existing candles or live previousClose / tradingDay values", async () => {
        const [withLiveData, withCandle] = await makeStocks();
        await Stock.updateOne({ _id: withLiveData._id }, { previousClose: 480, tradingDay: "2026-11-05" });
        const existing = await Candle.create({
            stockId: withCandle._id, interval: "1d", bucketStart: new Date("2026-11-04T18:30:00Z"),
            open: 1, high: 2, low: 1, close: 2
        });

        const report = await runBackfill({ apply: true, confirmDb: mongoose.connection.name, filter: only([withLiveData, withCandle]), checkUserData: false });

        const live = await Stock.findById(withLiveData._id);
        expect(live.previousClose).toBe(480); // kept
        expect(live.tradingDay).toBe("2026-11-05"); // kept
        expect(await Candle.countDocuments({ stockId: withLiveData._id })).toBeGreaterThan(0); // history still added
        expect(report.stocks.find((s) => s.symbol === withCandle.symbol).skipped).toBe("already has candles");
        expect(await Candle.findById(existing._id).lean()).toMatchObject({ open: 1, high: 2, low: 1, close: 2 });
        expect(await Candle.countDocuments({ stockId: withCandle._id })).toBe(1);
    });

    it("leaves a user's wallet, holdings, orders and transactions untouched", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(250);
        const read = async () => ({
            wallet: (await request(app).get("/api/wallet").set("Authorization", user.authHeader)).body.data,
            holdings: (await request(app).get("/api/holdings").set("Authorization", user.authHeader)).body.data,
            orders: (await request(app).get("/api/orders").set("Authorization", user.authHeader)).body.data,
            transactions: (await request(app).get("/api/transactions").set("Authorization", user.authHeader)).body.data
        });
        await request(app).post("/api/orders").set("Authorization", user.authHeader).send({ stockId: stock._id.toString(), quantity: 4 });
        const before = await read();

        await runBackfill({ apply: true, confirmDb: mongoose.connection.name, filter: { _id: stock._id }, checkUserData: false });

        expect(await read()).toEqual(before);
    });
});

describe("the before/after safety check", () => {
    const snapshot = { users: 3, wallets: 3, holdings: 2, orders: 5, transactions: 5, prices: "a:100|b:200" };

    it("passes when nothing changed", () => {
        expect(() => assertSnapshotsMatch(snapshot, { ...snapshot })).not.toThrow();
    });

    it("fails and names what changed (a deleted order, a changed price)", () => {
        expect(() => assertSnapshotsMatch(snapshot, { ...snapshot, orders: 4 })).toThrow(/orders/);
        expect(() => assertSnapshotsMatch(snapshot, { ...snapshot, prices: "a:101|b:200" })).toThrow(/prices/);
    });
});
