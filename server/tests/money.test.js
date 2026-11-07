import { describe, it, expect } from "vitest";

import {
    toPaise,
    roundMoney,
    lineTotal,
    subtractMoney,
    addMoney,
    sumMoney,
    canAfford,
    roundRate,
    roundToTick
} from "../src/utils/money.js";

describe("money helpers", () => {

    it("shows why plain float maths is not safe for money", () => {
        expect(0.1 + 0.2).not.toBe(0.3);
        expect(0.05 * 3).not.toBe(0.15);
        expect(1.005 * 100).not.toBe(100.5);
    });

    it("converts to whole paise without float dust", () => {
        expect(toPaise(1.005)).toBe(101);
        expect(toPaise(2850.05)).toBe(285005);
        expect(toPaise(0.1 + 0.2)).toBe(30);
        expect(toPaise(-12.345)).toBe(-1234); // half-way values round toward +infinity
    });

    it("multiplies price by quantity exactly", () => {
        expect(lineTotal(0.05, 3)).toBe(0.15);
        expect(lineTotal(2850.05, 3)).toBe(8550.15);
        expect(lineTotal(19.99, 7)).toBe(139.93);
    });

    it("adds and subtracts exactly", () => {
        expect(addMoney(0.1, 0.2)).toBe(0.3);
        expect(subtractMoney(100000, 8550.15)).toBe(91449.85);
        expect(sumMoney([0.1, 0.2, 0.3])).toBe(0.6);
    });

    it("rounds any amount to two decimals", () => {
        expect(roundMoney(0.30000000000000004)).toBe(0.3);
        expect(roundMoney(10.126)).toBe(10.13);
    });

    it("lets a user spend exactly their whole balance", () => {
        // 3 x 33.33 = 99.99; the wallet holds exactly 99.99, built from float-unfriendly steps
        const balance = roundMoney(0.1 + 99.89);
        expect(canAfford(balance, lineTotal(33.33, 3))).toBe(true);
        expect(canAfford(99.98, lineTotal(33.33, 3))).toBe(false);
    });

    it("keeps six decimals for a per-share rate", () => {
        expect(roundRate(1234.5678912345)).toBe(1234.567891);
    });

    it("snaps prices to the 5 paisa tick", () => {
        expect(roundToTick(100.02)).toBe(100);
        expect(roundToTick(100.03)).toBe(100.05);
        expect(roundToTick(2850.12)).toBe(2850.1);
    });

    it("keeps the balance exact over many small trades (no drift)", () => {
        // Float version drifts; the paise version ends at exactly the right amount
        let floatBalance = 100000;
        let balance = 100000;
        for (let i = 0; i < 10000; i++) {
            floatBalance -= 0.05 * 3;
            balance = subtractMoney(balance, lineTotal(0.05, 3));
        }
        expect(balance).toBe(98500);
        expect(floatBalance).not.toBe(98500);
    });
});
