import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// FYERS is replaced by fakes: no real network calls and no real tokens are touched.
vi.mock("../src/modules/market/market.token.service.js", () => ({
    getSavedFyersTokens: vi.fn(),
    getFyersConnectionStatus: vi.fn(),
    updateFyersConnectionStatus: vi.fn()
}));

import { request, app } from "./helpers/tradeosTestUtils.js";

import {
    getSavedFyersTokens,
    updateFyersConnectionStatus
} from "../src/modules/market/market.token.service.js";
import { clearIndexCache, getMarketIndices } from "../src/modules/market/market.service.js";

const validTokens = () => ({
    accessToken: "test-access-token",
    accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000)
});

// Builds a fake FYERS quote response for whichever symbol was asked
const fyersQuote = (symbol, price) => ({
    ok: true,
    status: 200,
    json: async () => ({
        s: "ok",
        d: [{ v: { symbol, lp: price, ch: 12.5, chp: 0.05, tt: 1_700_000_000 } }]
    })
});

const symbolFromCall = (url) => new URL(url).searchParams.get("symbols");

describe("Market indices: shared cache in front of FYERS", () => {
    let fetchMock;

    beforeEach(() => {
        clearIndexCache();
        vi.clearAllMocks();
        vi.useFakeTimers({ toFake: ["Date"] }); // lets the test move the clock without waiting
        getSavedFyersTokens.mockResolvedValue(validTokens());

        fetchMock = vi.fn(async (url) => fyersQuote(symbolFromCall(url), 24800));
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("serves 50 simultaneous requests with ONE call per index (2 FYERS calls in total)", async () => {
        const results = await Promise.all(Array.from({ length: 50 }, () => getMarketIndices()));

        expect(fetchMock).toHaveBeenCalledTimes(2); // NIFTY 50 and SENSEX, once each
        expect(results.every((r) => r.indices.length === 2 && r.errors.length === 0)).toBe(true);
    });

    it("marks fresh data as live and says when it was fetched", async () => {
        const { indices } = await getMarketIndices();

        expect(indices.map((i) => i.name)).toEqual(["NIFTY 50", "SENSEX"]);
        expect(indices.every((i) => i.stale === false)).toBe(true);
        expect(indices[0].asOf).toBe(new Date().toISOString());
        expect(indices[0].lastPrice).toBe(24800);
    });

    it("does not call FYERS again within 30 seconds, and refreshes after that", async () => {
        await getMarketIndices();
        vi.setSystemTime(Date.now() + 20_000);
        await getMarketIndices();
        expect(fetchMock).toHaveBeenCalledTimes(2);

        vi.setSystemTime(Date.now() + 15_000); // 35 seconds since the first fetch
        await getMarketIndices();
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it("labels an earlier quote as stale when FYERS goes down, with its original time", async () => {
        const first = await getMarketIndices();

        vi.setSystemTime(Date.now() + 60_000);
        fetchMock.mockImplementation(async () => ({ ok: false, status: 500, json: async () => ({ s: "error" }) }));

        const { indices, errors } = await getMarketIndices();

        expect(errors).toHaveLength(0);
        expect(indices).toHaveLength(2);
        expect(indices.every((i) => i.stale === true)).toBe(true);
        expect(indices[0].asOf).toBe(first.indices[0].asOf); // not "now"
        expect(indices[0].lastPrice).toBe(24800);
    });

    it("stops showing an earlier quote after 5 minutes and reports errors instead", async () => {
        await getMarketIndices();

        vi.setSystemTime(Date.now() + 6 * 60_000);
        fetchMock.mockImplementation(async () => ({ ok: false, status: 500, json: async () => ({ s: "error" }) }));

        const { indices, errors } = await getMarketIndices();

        expect(indices).toHaveLength(0);
        expect(errors).toHaveLength(2);
    });

    it("handles a partial failure: one index live, the other reported as an error", async () => {
        fetchMock.mockImplementation(async (url) =>
            symbolFromCall(url).includes("SENSEX")
                ? { ok: false, status: 500, json: async () => ({ s: "error" }) }
                : fyersQuote(symbolFromCall(url), 24800)
        );

        const { indices, errors } = await getMarketIndices();

        expect(indices.map((i) => i.name)).toEqual(["NIFTY 50"]);
        expect(errors.map((e) => e.name)).toEqual(["SENSEX"]);
    });

    it("an expired FYERS token is reported and the connection is marked for re-authorization", async () => {
        getSavedFyersTokens.mockResolvedValue({
            accessToken: "old",
            accessTokenExpiresAt: new Date(Date.now() - 1000)
        });

        const { indices, errors } = await getMarketIndices();

        expect(indices).toHaveLength(0);
        expect(errors).toHaveLength(2);
        expect(errors[0].message).toMatch(/expired/i);
        expect(updateFyersConnectionStatus).toHaveBeenCalledWith("reauthorization_required");
        expect(fetchMock).not.toHaveBeenCalled(); // no point calling FYERS with a dead token
    });

    it("GET /api/market/indices returns the cached data with the stale flag and asOf", async () => {
        const response = await request(app).get("/api/market/indices");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.count).toBe(2);
        expect(response.body.indices[0]).toMatchObject({ name: "NIFTY 50", stale: false });
        expect(typeof response.body.indices[0].asOf).toBe("string");

        // a second request is served from the cache
        await request(app).get("/api/market/indices");
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
