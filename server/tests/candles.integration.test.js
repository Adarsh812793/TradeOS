import { describe, it, expect, beforeEach, afterEach } from "vitest";

import config from "../src/config/env.js";
import Candle from "../src/modules/candles/candle.model.js";
import { recordCandles, FIVE_MINUTE_RETENTION_MS } from "../src/modules/candles/candle.service.js";
import { runPriceUpdate } from "../src/modules/prices/price.service.js";
import { request, app, createTestStock } from "./helpers/tradeosTestUtils.js";

// Calendar: Mon 9 Nov 2026. IST = UTC + 5:30, so 9:15 IST = 03:45 UTC.
const at = (iso) => new Date(iso);
const fiveMinute = (stock) => Candle.find({ stockId: stock._id, interval: "5m" }).sort({ bucketStart: 1 }).lean();
const daily = (stock) => Candle.find({ stockId: stock._id, interval: "1d" }).lean();

describe("recording candles", () => {
    let stock;
    beforeEach(async () => { stock = await createTestStock(100); });

    it("builds open, high, low and close from price updates inside one 5-minute bucket", async () => {
        await recordCandles([{ stockId: stock._id, price: 100.0 }], at("2026-11-09T03:45:00Z")); // 9:15:00
        await recordCandles([{ stockId: stock._id, price: 100.25 }], at("2026-11-09T03:45:15Z"));
        await recordCandles([{ stockId: stock._id, price: 99.9 }], at("2026-11-09T03:45:30Z"));

        const candles = await fiveMinute(stock);

        expect(candles).toHaveLength(1);
        expect(candles[0]).toMatchObject({ open: 100, high: 100.25, low: 99.9, close: 99.9, synthetic: false });
        expect(candles[0].bucketStart).toEqual(at("2026-11-09T03:45:00Z"));
    });

    it("starts a new candle at 9:20 and keeps the earlier one unchanged", async () => {
        await recordCandles([{ stockId: stock._id, price: 100 }], at("2026-11-09T03:49:45Z")); // 9:19:45
        await recordCandles([{ stockId: stock._id, price: 105 }], at("2026-11-09T03:50:00Z")); // 9:20:00

        const candles = await fiveMinute(stock);

        expect(candles).toHaveLength(2);
        expect(candles[0]).toMatchObject({ open: 100, close: 100 });
        expect(candles[1]).toMatchObject({ open: 105, close: 105 });
        expect(candles[1].bucketStart).toEqual(at("2026-11-09T03:50:00Z"));
    });

    it("builds one daily candle from every update of the trading day", async () => {
        await recordCandles([{ stockId: stock._id, price: 100 }], at("2026-11-09T03:45:00Z"));
        await recordCandles([{ stockId: stock._id, price: 108 }], at("2026-11-09T06:00:00Z"));
        await recordCandles([{ stockId: stock._id, price: 97 }], at("2026-11-09T08:00:00Z"));
        await recordCandles([{ stockId: stock._id, price: 101 }], at("2026-11-09T09:59:45Z")); // 15:29:45 IST

        const candles = await daily(stock);

        expect(candles).toHaveLength(1);
        expect(candles[0]).toMatchObject({ open: 100, high: 108, low: 97, close: 101 });
        expect(candles[0].bucketStart).toEqual(at("2026-11-08T18:30:00Z")); // IST midnight of 9 Nov
    });

    it("continues the same candle after a restart in the middle of it (no duplicate, open kept)", async () => {
        await recordCandles([{ stockId: stock._id, price: 100 }], at("2026-11-09T03:45:00Z"));
        // ... server restarts here: nothing is remembered in memory ...
        await recordCandles([{ stockId: stock._id, price: 103 }], at("2026-11-09T03:47:00Z"));

        const candles = await fiveMinute(stock);

        expect(candles).toHaveLength(1);
        expect(candles[0]).toMatchObject({ open: 100, high: 103, close: 103 });
    });

    it("does not lose an update when many arrive at the same moment (atomic high and low)", async () => {
        const prices = [100, 120, 80, 110, 95, 130, 70, 105];
        await Promise.all(prices.map((price) =>
            recordCandles([{ stockId: stock._id, price }], at("2026-11-09T03:46:00Z"))
        ));

        const [candle] = await fiveMinute(stock);

        expect(await Candle.countDocuments({ stockId: stock._id, interval: "5m" })).toBe(1);
        expect(candle.high).toBe(130);
        expect(candle.low).toBe(70);
    });

    it("cannot hold two candles for the same stock, interval and start", async () => {
        const base = { stockId: stock._id, interval: "5m", bucketStart: at("2026-11-09T03:45:00Z"), open: 1, high: 1, low: 1, close: 1 };
        await Candle.create(base);

        await expect(Candle.create(base)).rejects.toMatchObject({ code: 11000 });
    });

    it("expires 5-minute candles after 14 calendar days and never expires daily ones", async () => {
        const now = at("2026-11-09T03:45:00Z");
        await recordCandles([{ stockId: stock._id, price: 100 }], now);

        const [five] = await fiveMinute(stock);
        const [day] = await daily(stock);

        expect(five.expireAt).toEqual(new Date(now.getTime() + FIVE_MINUTE_RETENTION_MS));
        expect(FIVE_MINUTE_RETENTION_MS).toBe(14 * 24 * 60 * 60 * 1000);
        expect(day.expireAt).toBeUndefined();

        const ttlIndex = (await Candle.collection.indexes()).find((index) => index.key.expireAt === 1);
        expect(ttlIndex.expireAfterSeconds).toBe(0);
    });
});

describe("candles written by the price job", () => {
    beforeEach(() => { config.MARKET_ALWAYS_OPEN = false; });
    afterEach(() => { config.MARKET_ALWAYS_OPEN = true; });

    const plusOne = { name: "test", getNextPrices: (stocks) => stocks.map((s) => ({ stockId: s._id, price: s.currentPrice + 1 })) };

    it("records one update per slot and never counts a skipped slot twice", async () => {
        const stock = await createTestStock(100);
        const filter = { _id: stock._id };
        const slot = at("2026-11-09T04:30:00Z"); // 10:00:00 IST

        await runPriceUpdate({ now: slot, provider: plusOne, filter });
        await runPriceUpdate({ now: new Date(slot.getTime() + 5000), provider: plusOne, filter }); // same slot: skipped
        await runPriceUpdate({ now: new Date(slot.getTime() + 15000), provider: plusOne, filter });

        const [candle] = await fiveMinute(stock);

        expect(candle).toMatchObject({ open: 101, high: 102, low: 101, close: 102 }); // two moves: 101 then 102
    });

    it("writes no candles while the market is closed", async () => {
        const stock = await createTestStock(100);

        await runPriceUpdate({ now: at("2026-11-07T06:00:00Z"), provider: plusOne, filter: { _id: stock._id } });

        expect(await Candle.countDocuments({ stockId: stock._id })).toBe(0);
    });
});

describe("GET /api/stocks/:id/candles", () => {
    const DAY = 24 * 60 * 60 * 1000;
    let stock;

    const insert = (interval, bucketStart, price) =>
        Candle.create({ stockId: stock._id, interval, bucketStart, open: price, high: price, low: price, close: price });
    const get = (query = "") => request(app).get(`/api/stocks/${stock._id}/candles${query}`);

    beforeEach(async () => { stock = await createTestStock(100); });

    it("answers 1D with only the latest trading day's 5-minute candles, oldest first", async () => {
        const today = at("2026-11-09T03:45:00Z"); // Mon 9:15
        await insert("5m", new Date(today.getTime() - 3 * DAY), 90); // Fri 6 Nov: an earlier day
        await insert("5m", new Date(today.getTime() + 5 * 60000), 102);
        await insert("5m", today, 101);

        const response = await get(); // 1D is the default

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({ range: "1D", interval: "5m" });
        expect(response.body.data.candles.map((c) => c.close)).toEqual([101, 102]);
        expect(response.body.data.candles[0]).toEqual({
            time: "2026-11-09T03:45:00.000Z", open: 101, high: 101, low: 101, close: 101, synthetic: false
        });
    });

    it("answers 1W with 5-minute candles from the last 7 days only", async () => {
        const now = Date.now();
        await insert("5m", new Date(now - 10 * DAY), 1);
        await insert("5m", new Date(now - 3 * DAY), 2);
        await insert("5m", new Date(now - 1 * DAY), 3);

        const { body } = await get("?range=1W");

        expect(body.data.interval).toBe("5m");
        expect(body.data.candles.map((c) => c.close)).toEqual([2, 3]);
    });

    it("answers 1M, 3M, 1Y and ALL from daily candles", async () => {
        const now = Date.now();
        await insert("1d", new Date(now - 400 * DAY), 1);
        await insert("1d", new Date(now - 200 * DAY), 2);
        await insert("1d", new Date(now - 60 * DAY), 3);
        await insert("1d", new Date(now - 10 * DAY), 4);

        const closes = async (range) => (await get(`?range=${range}`)).body.data.candles.map((c) => c.close);

        expect(await closes("1M")).toEqual([4]);
        expect(await closes("3M")).toEqual([3, 4]);
        expect(await closes("1Y")).toEqual([2, 3, 4]);
        expect(await closes("ALL")).toEqual([1, 2, 3, 4]);
    });

    it("returns an empty list (not an error) for a stock with no candles yet", async () => {
        const response = await get("?range=1D");

        expect(response.status).toBe(200);
        expect(response.body.data.candles).toEqual([]);
    });

    it("rejects an unknown range with 400", async () => {
        expect((await get("?range=5Y")).status).toBe(400);
    });

    it("answers 404 for a stock that does not exist and 400 for a malformed id", async () => {
        const missing = await request(app).get("/api/stocks/64b64b64b64b64b64b64b64b/candles");
        expect(missing.status).toBe(404);
        expect(missing.body.errorCode).toBe("STOCK_NOT_FOUND");

        expect((await request(app).get("/api/stocks/not-an-id/candles")).status).toBe(400);
    });
});
