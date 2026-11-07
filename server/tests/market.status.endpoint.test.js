import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import config from "../src/config/env.js";
import Stock from "../src/modules/stocks/stock.model.js";
import { getMarketStatus } from "../src/modules/market/market.hours.js";
import { request, app, createTestStock } from "./helpers/tradeosTestUtils.js";

// Same technique as orders.market.test.js: only the MARKET's clock is faked
vi.mock("../src/modules/market/market.hours.js", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, getMarketStatus: vi.fn(actual.getMarketStatus) };
});

let realGetMarketStatus;
const marketClockAt = (iso) =>
    getMarketStatus.mockImplementation((_now, options) => realGetMarketStatus(new Date(iso), options));

describe("GET /api/market/status", () => {
    beforeEach(async () => {
        realGetMarketStatus = (await vi.importActual("../src/modules/market/market.hours.js")).getMarketStatus;
        config.MARKET_ALWAYS_OPEN = false;
    });
    afterEach(() => {
        config.MARKET_ALWAYS_OPEN = true;
        getMarketStatus.mockImplementation(realGetMarketStatus);
    });

    it("says closed on a Saturday and when the market opens next", async () => {
        marketClockAt("2026-11-07T06:00:00Z");

        const { status, body } = await request(app).get("/api/market/status");

        expect(status).toBe(200);
        expect(body.data).toMatchObject({
            isOpen: false,
            reason: "weekend",
            tradingDay: "2026-11-07",
            nextOpenAt: "2026-11-09T03:45:00.000Z",
            priceSource: "simulated"
        });
        expect(Date.parse(body.data.serverTime)).not.toBeNaN();
    });

    it("says open during market hours, with no next opening", async () => {
        marketClockAt("2026-11-09T04:00:00Z");

        const { body } = await request(app).get("/api/market/status");

        expect(body.data).toMatchObject({ isOpen: true, reason: "open", nextOpenAt: null });
    });

    it("names the holiday", async () => {
        marketClockAt("2026-11-10T06:00:00Z");

        const { body } = await request(app).get("/api/market/status");

        expect(body.data).toMatchObject({ isOpen: false, reason: "holiday", holidayName: "Diwali Balipratipada" });
    });

    it("reports the development override as open", async () => {
        marketClockAt("2026-11-07T20:00:00Z");
        config.MARKET_ALWAYS_OPEN = true;

        const { body } = await request(app).get("/api/market/status");

        expect(body.data).toMatchObject({ isOpen: true, reason: "override" });
    });
});

describe("today's change on stock responses", () => {
    const findInList = async (stock) =>
        (await request(app).get("/api/stocks")).body.data.find((item) => item._id === stock._id.toString());

    it("adds dayChange and dayChangePercent against the previous close (exact paise)", async () => {
        const stock = await createTestStock(101.25);
        await Stock.updateOne({ _id: stock._id }, { previousClose: 100 });

        const listed = await findInList(stock);
        const single = (await request(app).get(`/api/stocks/${stock._id}`)).body.data;

        for (const item of [listed, single]) {
            expect(item.dayChange).toBe(1.25);
            expect(item.dayChangePercent).toBe(1.25);
            expect(item.previousClose).toBe(100);
        }
    });

    it("shows a fall as negative numbers", async () => {
        const stock = await createTestStock(97.35);
        await Stock.updateOne({ _id: stock._id }, { previousClose: 100 });

        const listed = await findInList(stock);

        expect(listed.dayChange).toBe(-2.65);
        expect(listed.dayChangePercent).toBe(-2.65);
    });

    it("is 0 (not an error) for a stock that has no previous close yet", async () => {
        const stock = await createTestStock(500);

        const listed = await findInList(stock);

        expect(listed.dayChange).toBe(0);
        expect(listed.dayChangePercent).toBe(0);
    });
});
