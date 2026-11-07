import { describe, it, expect, vi } from "vitest";

import { createQuoteCache } from "../src/modules/market/market.cache.js";

// A cache with a clock the test controls, and a fetcher that counts how often "FYERS" is called.
const setup = () => {
    let time = 1_000_000;
    const cache = createQuoteCache({
        freshMs: 30_000,
        maxStaleMs: 300_000,
        failureCooldownMs: 5_000,
        now: () => time
    });
    const advance = (ms) => { time += ms; };

    return { cache, advance, time: () => time };
};

// A fetcher that resolves after a short delay (so requests really overlap)
const slowFetcher = (value, delayMs = 20) =>
    vi.fn(() => new Promise((resolve) => setTimeout(() => resolve(value), delayMs)));

const failingFetcher = (message = "FYERS is down", delayMs = 20) =>
    vi.fn(() => new Promise((_, reject) => setTimeout(() => reject(new Error(message)), delayMs)));

describe("Quote cache: stampede protection", () => {

    it("calls FYERS once for 50 simultaneous requests", async () => {
        const { cache } = setup();
        const fetcher = slowFetcher({ lastPrice: 24800 });

        const results = await Promise.all(
            Array.from({ length: 50 }, () => cache.get("NIFTY", fetcher))
        );

        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(results.every((r) => r.value.lastPrice === 24800 && r.stale === false)).toBe(true);
    });

    it("calls FYERS once when the value has just expired and many requests arrive together", async () => {
        const { cache, advance } = setup();
        const first = slowFetcher({ lastPrice: 1 });
        await cache.get("NIFTY", first);

        advance(31_000); // past the 30 second freshness window

        const second = slowFetcher({ lastPrice: 2 });
        const results = await Promise.all(
            Array.from({ length: 30 }, () => cache.get("NIFTY", second))
        );

        expect(second).toHaveBeenCalledTimes(1);
        expect(results.every((r) => r.value.lastPrice === 2)).toBe(true);
    });

    it("keeps different keys independent", async () => {
        const { cache } = setup();
        const nifty = slowFetcher({ name: "NIFTY" });
        const sensex = slowFetcher({ name: "SENSEX" });

        const [a, b] = await Promise.all([cache.get("NIFTY", nifty), cache.get("SENSEX", sensex)]);

        expect(a.value.name).toBe("NIFTY");
        expect(b.value.name).toBe("SENSEX");
        expect(nifty).toHaveBeenCalledTimes(1);
        expect(sensex).toHaveBeenCalledTimes(1);
    });
});

describe("Quote cache: freshness", () => {

    it("serves a fresh value without calling FYERS again, then refreshes after 30 seconds", async () => {
        const { cache, advance } = setup();
        const fetcher = slowFetcher({ lastPrice: 100 });

        await cache.get("NIFTY", fetcher);
        advance(29_000);
        const stillFresh = await cache.get("NIFTY", fetcher);

        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(stillFresh.stale).toBe(false);

        advance(2_000); // 31 seconds in total
        await cache.get("NIFTY", fetcher);

        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it("reports when the value was fetched (fetchedAt)", async () => {
        const { cache, time } = setup();
        const result = await cache.get("NIFTY", slowFetcher({ lastPrice: 1 }));

        expect(result.fetchedAt).toBe(time());
    });
});

describe("Quote cache: FYERS failures", () => {

    it("rejects when FYERS fails and there is no earlier value", async () => {
        const { cache } = setup();

        await expect(cache.get("NIFTY", failingFetcher("token expired"))).rejects.toThrow("token expired");
    });

    it("gives every simultaneous caller the failure, with ONE call to FYERS", async () => {
        const { cache } = setup();
        const fetcher = failingFetcher();

        const results = await Promise.allSettled(
            Array.from({ length: 40 }, () => cache.get("NIFTY", fetcher))
        );

        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(results.every((r) => r.status === "rejected")).toBe(true);
    });

    it("does not call FYERS again during the 5 second cooldown, and retries after it", async () => {
        const { cache, advance } = setup();
        const failing = failingFetcher();

        await expect(cache.get("NIFTY", failing)).rejects.toThrow();
        advance(2_000);
        await expect(cache.get("NIFTY", failing)).rejects.toThrow();
        expect(failing).toHaveBeenCalledTimes(1); // second request was answered from the cooldown

        advance(4_000); // 6 seconds since the failure
        const recovered = slowFetcher({ lastPrice: 5 });
        const result = await cache.get("NIFTY", recovered);

        expect(recovered).toHaveBeenCalledTimes(1);
        expect(result.value.lastPrice).toBe(5);
        expect(result.stale).toBe(false);
    });

    it("never leaves the entry stuck after a failure", async () => {
        const { cache, advance } = setup();

        await expect(cache.get("NIFTY", failingFetcher())).rejects.toThrow();
        advance(6_000);

        await expect(cache.get("NIFTY", slowFetcher({ lastPrice: 9 }))).resolves.toMatchObject({ stale: false });
    });
});

describe("Quote cache: old data is never presented as live", () => {

    it("returns the earlier value labelled stale (with its real time) when a refresh fails", async () => {
        const { cache, advance } = setup();
        const first = await cache.get("NIFTY", slowFetcher({ lastPrice: 100 }));

        advance(40_000); // expired, and FYERS now fails
        const result = await cache.get("NIFTY", failingFetcher());

        expect(result.value.lastPrice).toBe(100);
        expect(result.stale).toBe(true);
        expect(result.fetchedAt).toBe(first.fetchedAt); // the ORIGINAL time, not "now"
    });

    it("keeps labelling it stale (not live) on later requests during the cooldown", async () => {
        const { cache, advance } = setup();
        await cache.get("NIFTY", slowFetcher({ lastPrice: 100 }));

        advance(40_000);
        await cache.get("NIFTY", failingFetcher());
        advance(1_000);
        const again = await cache.get("NIFTY", slowFetcher({ lastPrice: 999 }));

        expect(again.stale).toBe(true);
        expect(again.value.lastPrice).toBe(100);
    });

    it("drops the old value once it is older than 5 minutes and reports the error instead", async () => {
        const { cache, advance } = setup();
        await cache.get("NIFTY", slowFetcher({ lastPrice: 100 }));

        advance(5 * 60_000 + 1_000); // older than the stale limit
        await expect(cache.get("NIFTY", failingFetcher("FYERS is down"))).rejects.toThrow("FYERS is down");
    });

    it("goes back to live data as soon as FYERS recovers", async () => {
        const { cache, advance } = setup();
        await cache.get("NIFTY", slowFetcher({ lastPrice: 100 }));

        advance(40_000);
        await cache.get("NIFTY", failingFetcher()); // stale answer
        advance(6_000); // cooldown over

        const live = await cache.get("NIFTY", slowFetcher({ lastPrice: 105 }));

        expect(live.value.lastPrice).toBe(105);
        expect(live.stale).toBe(false);
    });
});
