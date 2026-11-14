import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import config from "../src/config/env.js";
import { getMarketStatus } from "../src/modules/market/market.hours.js";
import {
    request,
    app,
    createAuthenticatedUser,
    createTestStock
} from "./helpers/tradeosTestUtils.js";

// Only the MARKET's clock is faked (a fake system clock would also break login tokens, which are time-limited).
// Each test picks the instant the market hours code should evaluate.
vi.mock("../src/modules/market/market.hours.js", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, getMarketStatus: vi.fn(actual.getMarketStatus) };
});

let realGetMarketStatus;

const marketClockAt = (iso) => {
    getMarketStatus.mockImplementation((_now, options) => realGetMarketStatus(new Date(iso), options));
};

const buy = (user, stock, quantity = 1) =>
    request(app).post("/api/orders").set("Authorization", user.authHeader)
        .send({ stockId: stock._id.toString(), quantity });

const sell = (user, stock, quantity = 1) =>
    request(app).post("/api/orders/sell").set("Authorization", user.authHeader)
        .send({ stockId: stock._id.toString(), quantity });

const balanceOf = async (user) =>
    (await request(app).get("/api/wallet").set("Authorization", user.authHeader)).body.data.balance;

describe("Orders and the market clock", () => {

    beforeEach(async () => {
        const actual = await vi.importActual("../src/modules/market/market.hours.js");
        realGetMarketStatus = actual.getMarketStatus;
        config.MARKET_ALWAYS_OPEN = false; // the normal, production-like behaviour for these tests
    });

    afterEach(() => {
        config.MARKET_ALWAYS_OPEN = true; // vitest.config.js default for every other test file
        getMarketStatus.mockImplementation(realGetMarketStatus);
    });

    it("rejects a buy on a Saturday with 403 MARKET_CLOSED and changes nothing", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(100);
        marketClockAt("2026-11-07T06:00:00Z"); // Saturday 11:30 IST

        const response = await buy(user, stock);

        expect(response.status).toBe(403);
        expect(response.body.errorCode).toBe("MARKET_CLOSED");
        expect(await balanceOf(user)).toBe(100000);
        const orders = await request(app).get("/api/orders").set("Authorization", user.authHeader);
        expect(orders.body.data.pagination.totalItems).toBe(0);
    });

    it("rejects a sell while closed, even when the user owns the shares", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(100);

        marketClockAt("2026-11-09T04:00:00Z"); // Monday 9:30 IST, open
        expect((await buy(user, stock, 2)).status).toBe(201);

        marketClockAt("2026-11-09T10:00:00Z"); // Monday 15:30 IST, the bell has rung
        const response = await sell(user, stock, 1);

        expect(response.status).toBe(403);
        expect(response.body.errorCode).toBe("MARKET_CLOSED");
    });

    it("rejects orders on an exchange holiday", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(100);
        marketClockAt("2026-11-10T06:00:00Z"); // Tuesday 10 Nov: Diwali Balipratipada

        expect((await buy(user, stock)).status).toBe(403);
    });

    it("accepts orders during market hours", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(100);
        marketClockAt("2026-11-09T04:00:00Z"); // Monday 9:30 IST

        expect((await buy(user, stock)).status).toBe(201);
    });

    it("accepts orders at night when the development override is on", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(100);
        marketClockAt("2026-11-07T20:00:00Z"); // Saturday night
        config.MARKET_ALWAYS_OPEN = true;

        expect((await buy(user, stock)).status).toBe(201);
    });

    it("still lets users read their data while the market is closed", async () => {
        const user = await createAuthenticatedUser();
        marketClockAt("2026-11-07T06:00:00Z");

        for (const path of ["/api/portfolio", "/api/wallet", "/api/orders", "/api/stocks"]) {
            const response = await request(app).get(path).set("Authorization", user.authHeader);
            expect(response.status, path).toBe(200);
        }
    });
});

describe("MARKET_ALWAYS_OPEN startup guard", () => {
    const original = { ...process.env };

    afterEach(() => {
        process.env = { ...original };
        vi.resetModules();
    });

    // These tests start the config under other environments, where the test-only memory email provider is refused and
    // production needs real email settings, so every start here carries a valid email setup
    const validEmailEnv = { EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_test_key", EMAIL_FROM: "TradeOS <onboarding@resend.dev>" };

    const loadConfig = async (env) => {
        process.env = { ...original, ...validEmailEnv, ...env };
        vi.resetModules();
        return (await import("../src/config/env.js")).default;
    };

    it("refuses to start in production", async () => {
        await expect(loadConfig({ NODE_ENV: "production", MARKET_ALWAYS_OPEN: "true" })).rejects.toThrow(/MARKET_ALWAYS_OPEN/);
    });

    it("refuses to start in any environment that is not explicitly development or test (for example staging)", async () => {
        await expect(loadConfig({ NODE_ENV: "staging", MARKET_ALWAYS_OPEN: "true" })).rejects.toThrow(/MARKET_ALWAYS_OPEN/);
    });

    it("is allowed in development and in test", async () => {
        expect((await loadConfig({ NODE_ENV: "development", MARKET_ALWAYS_OPEN: "true" })).MARKET_ALWAYS_OPEN).toBe(true);
        expect((await loadConfig({ NODE_ENV: "test", MARKET_ALWAYS_OPEN: "true" })).MARKET_ALWAYS_OPEN).toBe(true);
    });

    it("is off by default, and production starts normally without it", async () => {
        expect((await loadConfig({ NODE_ENV: "production", MARKET_ALWAYS_OPEN: "" })).MARKET_ALWAYS_OPEN).toBe(false);
    });
});
