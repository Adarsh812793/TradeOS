import { describe, it, expect } from "vitest";

import {
    STEP_VOLATILITY,
    DAILY_LIMIT,
    randomNormal,
    nextPrice,
    createSimulatedProvider
} from "../src/modules/prices/simulated.provider.js";
import { toPaise } from "../src/utils/money.js";

// A small seeded random generator (mulberry32), so every run of these tests sees the same numbers
const seeded = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const spread = (values) => {
    const center = mean(values);
    return Math.sqrt(mean(values.map((v) => (v - center) ** 2)));
};

describe("price simulator", () => {

    it("scales 25% yearly volatility down to about 0.0407% per 15-second step", () => {
        // 252 days x 6.25 h x 3600 s / 15 s = 378,000 steps a year; 0.25 / sqrt(378000)
        expect(STEP_VOLATILITY).toBeCloseTo(0.25 / Math.sqrt(378000), 8);
        expect(STEP_VOLATILITY * 100).toBeCloseTo(0.0407, 3);
    });

    it("makes random numbers with mean 0 and spread 1", () => {
        const random = seeded(1);
        const sample = Array.from({ length: 50000 }, () => randomNormal(random));

        expect(Math.abs(mean(sample))).toBeLessThan(0.02);
        expect(spread(sample)).toBeGreaterThan(0.98);
        expect(spread(sample)).toBeLessThan(1.02);
    });

    it("adds up to about 1.58% a day over the 1,500 steps of a trading day", () => {
        const random = seeded(7);
        const dailyReturns = [];

        for (let day = 0; day < 300; day++) {
            let price = 2850;
            for (let step = 0; step < 1500; step++) {
                price = nextPrice({ price, previousClose: 2850, random });
            }
            dailyReturns.push(Math.log(price / 2850));
        }

        // 25% / sqrt(252) = 1.575%; allow 10% either way for sampling noise and tick rounding
        expect(spread(dailyReturns)).toBeGreaterThan(0.0142);
        expect(spread(dailyReturns)).toBeLessThan(0.0173);
    });

    it("has no built-in drift: the average day ends close to where it started", () => {
        const random = seeded(11);
        const ratios = [];

        for (let day = 0; day < 300; day++) {
            let price = 1000;
            for (let step = 0; step < 1500; step++) {
                price = nextPrice({ price, previousClose: 1000, random });
            }
            ratios.push(price / 1000);
        }

        expect(Math.abs(mean(ratios) - 1)).toBeLessThan(0.005);
    });

    it("always returns a multiple of 5 paise", () => {
        const random = seeded(3);
        let price = 1725;

        for (let step = 0; step < 2000; step++) {
            price = nextPrice({ price, previousClose: 1725, random });
            expect(toPaise(price) % 5).toBe(0);
        }
    });

    it("never leaves the 10% daily limit, even with the most extreme random numbers", () => {
        // Box-Muller: Z = sqrt(-2 ln u1) x cos(2 pi u2). u1 = 1e-12 gives a huge radius; u2 = 0.5 gives cos = -1 (a fall)
        // and u2 = 0 gives cos = +1 (a rise). random() is asked for u1's complement first, then u2.
        const extreme = (u2) => {
            let call = 0;
            return () => (call++ % 2 === 0 ? 1 - 1e-12 : u2);
        };

        // one step is tiny (a 7-sigma shock moves about 0.3%), so the limit only matters close to the edge
        expect(nextPrice({ price: 100, previousClose: 100, random: extreme(0.5) })).toBeGreaterThan(99);
        expect(nextPrice({ price: 90.05, previousClose: 100, random: extreme(0.5) })).toBe(90);
        expect(nextPrice({ price: 109.95, previousClose: 100, random: extreme(0) })).toBe(110);
        expect(DAILY_LIMIT).toBe(0.1);
    });

    it("pulls a price that is already outside the limit back to the edge", () => {
        const random = seeded(5);
        expect(nextPrice({ price: 150, previousClose: 100, random })).toBe(110);
        expect(nextPrice({ price: 50, previousClose: 100, random })).toBe(90);
    });

    it("is repeatable with the same seed", () => {
        const run = () => {
            const random = seeded(42);
            let price = 3850;
            for (let step = 0; step < 100; step++) price = nextPrice({ price, previousClose: 3850, random });
            return price;
        };

        expect(run()).toBe(run());
    });

    it("builds a provider that answers one price per stock and names itself 'simulated'", () => {
        const provider = createSimulatedProvider({ random: seeded(9) });
        const stocks = [
            { _id: "a", symbol: "AAA", currentPrice: 500, previousClose: 500 },
            { _id: "b", symbol: "BBB", currentPrice: 1500, previousClose: null }
        ];

        const prices = provider.getNextPrices(stocks);

        expect(provider.name).toBe("simulated");
        expect(prices.map((p) => p.stockId)).toEqual(["a", "b"]);
        prices.forEach((p) => expect(p.price).toBeGreaterThan(0));
    });
});
