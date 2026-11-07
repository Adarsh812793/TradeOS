import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import config from "../src/config/env.js";
import Stock from "../src/modules/stocks/stock.model.js";
import { runPriceUpdate } from "../src/modules/prices/price.service.js";
import { startPriceJob } from "../src/modules/prices/price.job.js";
import { createTestStock } from "./helpers/tradeosTestUtils.js";

// A provider that adds exactly 50 paise per step, so every expectation is exact
const plusFifty = {
    name: "test",
    getNextPrices: (stocks) => stocks.map((stock) => ({ stockId: stock._id, price: Math.round((stock.currentPrice + 0.5) * 100) / 100 }))
};

// Calendar: Sat 7 Nov (closed), Mon 9 Nov (open), Tue 10 Nov (holiday), Wed 11 Nov (open). IST = UTC + 5:30.
const MONDAY_10_00 = new Date("2026-11-09T04:30:00.000Z"); // 10:00:00 IST, exactly on a 15 s slot boundary
const plusSeconds = (date, seconds) => new Date(date.getTime() + seconds * 1000);

const reload = (stock) => Stock.findById(stock._id).lean();

describe("price service", () => {
    let stock;
    let only;

    beforeEach(async () => {
        config.MARKET_ALWAYS_OPEN = false;
        stock = await createTestStock(1000);
        only = { _id: stock._id }; // touch only this test's stock
    });

    afterEach(() => {
        config.MARKET_ALWAYS_OPEN = true;
    });

    it("does nothing while the market is closed (Saturday)", async () => {
        const result = await runPriceUpdate({ now: new Date("2026-11-07T06:00:00Z"), provider: plusFifty, filter: only });

        expect(result).toEqual({ skipped: "weekend" });
        const after = await reload(stock);
        expect(after.currentPrice).toBe(1000);
        expect(after.lastPriceUpdateAt).toBeNull();
    });

    it("does nothing on an exchange holiday", async () => {
        const result = await runPriceUpdate({ now: new Date("2026-11-10T05:00:00Z"), provider: plusFifty, filter: only });

        expect(result).toEqual({ skipped: "holiday" });
        expect((await reload(stock)).currentPrice).toBe(1000);
    });

    it("moves the price while open and starts the trading day with previousClose = the old price", async () => {
        const result = await runPriceUpdate({ now: MONDAY_10_00, provider: plusFifty, filter: only });
        const after = await reload(stock);

        expect(result).toMatchObject({ updated: 1, unchanged: 0, tradingDay: "2026-11-09" });
        expect(after.currentPrice).toBe(1000.5);
        expect(after.previousClose).toBe(1000);
        expect(after.tradingDay).toBe("2026-11-09");
        expect(after.lastPriceUpdateAt).toEqual(MONDAY_10_00);
    });

    it("moves a price only once per 15-second slot", async () => {
        await runPriceUpdate({ now: plusSeconds(MONDAY_10_00, 2), provider: plusFifty, filter: only });
        const again = await runPriceUpdate({ now: plusSeconds(MONDAY_10_00, 9), provider: plusFifty, filter: only });

        expect(again.updated).toBe(0);
        expect((await reload(stock)).currentPrice).toBe(1000.5);
    });

    it("moves again in the next slot and keeps the same previousClose all day", async () => {
        await runPriceUpdate({ now: MONDAY_10_00, provider: plusFifty, filter: only });
        await runPriceUpdate({ now: plusSeconds(MONDAY_10_00, 15), provider: plusFifty, filter: only });
        await runPriceUpdate({ now: plusSeconds(MONDAY_10_00, 30), provider: plusFifty, filter: only });
        const after = await reload(stock);

        expect(after.currentPrice).toBe(1001.5);
        expect(after.previousClose).toBe(1000);
    });

    it("keeps previousClose across a server restart in the middle of the day", async () => {
        await runPriceUpdate({ now: MONDAY_10_00, provider: plusFifty, filter: only });
        await runPriceUpdate({ now: plusSeconds(MONDAY_10_00, 15), provider: plusFifty, filter: only });

        // "restart": a brand-new provider and nothing remembered in memory; state comes only from MongoDB
        const freshProvider = { ...plusFifty };
        await runPriceUpdate({ now: plusSeconds(MONDAY_10_00, 3600), provider: freshProvider, filter: only });
        const after = await reload(stock);

        expect(after.previousClose).toBe(1000);
        expect(after.currentPrice).toBe(1001.5);
    });

    it("rolls previousClose to the last price on the next trading day, skipping the holiday in between", async () => {
        await runPriceUpdate({ now: MONDAY_10_00, provider: plusFifty, filter: only });
        await runPriceUpdate({ now: plusSeconds(MONDAY_10_00, 15), provider: plusFifty, filter: only }); // Monday close: 1001

        // server was off all of Tuesday (holiday) and the market was closed; Wednesday's first update:
        const wednesday = new Date("2026-11-11T04:00:00Z"); // Wed 9:30 IST
        await runPriceUpdate({ now: wednesday, provider: plusFifty, filter: only });
        const after = await reload(stock);

        expect(after.tradingDay).toBe("2026-11-11");
        expect(after.previousClose).toBe(1001);
        expect(after.currentPrice).toBe(1001.5);
    });

    it("lets exactly one of two simultaneous runs move the price (a second server racing the first)", async () => {
        const [a, b] = await Promise.all([
            runPriceUpdate({ now: MONDAY_10_00, provider: plusFifty, filter: only }),
            runPriceUpdate({ now: MONDAY_10_00, provider: plusFifty, filter: only })
        ]);

        expect(a.updated + b.updated).toBe(1);
        expect((await reload(stock)).currentPrice).toBe(1000.5);
    });

    it("moves prices at night when the development override is on", async () => {
        config.MARKET_ALWAYS_OPEN = true;
        const saturdayNight = new Date("2026-11-07T20:00:00Z");

        const result = await runPriceUpdate({ now: saturdayNight, provider: plusFifty, filter: only });

        expect(result.updated).toBe(1);
        expect((await reload(stock)).currentPrice).toBe(1000.5);
    });

    it("leaves inactive stocks alone", async () => {
        await Stock.updateOne({ _id: stock._id }, { isActive: false });

        const result = await runPriceUpdate({ now: MONDAY_10_00, provider: plusFifty, filter: only });

        expect(result.updated).toBe(0);
        expect((await reload(stock)).currentPrice).toBe(1000);
    });

    it("works with the real simulator: a small move that stays a multiple of 5 paise", async () => {
        const result = await runPriceUpdate({ now: MONDAY_10_00, filter: only }); // default provider
        const after = await reload(stock);

        expect(result.updated).toBe(1);
        expect(Math.abs(after.currentPrice - 1000)).toBeLessThan(10); // one 15 s step is a fraction of a percent
        expect(Math.round(after.currentPrice * 100) % 5).toBe(0);
    });
});

describe("price job", () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] }));
    afterEach(() => vi.useRealTimers());

    it("runs once at start and then on every interval, until stopped", async () => {
        const run = vi.fn().mockResolvedValue({});
        const job = startPriceJob({ intervalMs: 15000, run });
        await vi.advanceTimersByTimeAsync(0);
        expect(run).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(15000);
        await vi.advanceTimersByTimeAsync(15000);
        expect(run).toHaveBeenCalledTimes(3);

        job.stop();
        await vi.advanceTimersByTimeAsync(60000);
        expect(run).toHaveBeenCalledTimes(3);
    });

    it("skips a tick while the previous run is still busy (runs never pile up)", async () => {
        let finish;
        const run = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
        const job = startPriceJob({ intervalMs: 15000, run });

        await vi.advanceTimersByTimeAsync(45000); // three more ticks arrive while the first run is still going
        expect(run).toHaveBeenCalledTimes(1);

        finish({});
        await vi.advanceTimersByTimeAsync(15000);
        expect(run).toHaveBeenCalledTimes(2);
        job.stop();
    });

    it("survives an error: it is logged and the next tick runs normally", async () => {
        const logged = vi.spyOn(console, "error").mockImplementation(() => {});
        const run = vi.fn().mockRejectedValueOnce(new Error("database hiccup")).mockResolvedValue({});
        const job = startPriceJob({ intervalMs: 15000, run });

        await vi.advanceTimersByTimeAsync(15000);

        expect(run).toHaveBeenCalledTimes(2);
        expect(logged).toHaveBeenCalledWith("[prices] update failed:", "database hiccup");
        job.stop();
        logged.mockRestore();
    });
});
