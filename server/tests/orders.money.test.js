import { describe, it, expect } from "vitest";
import {
    request,
    app,
    createAuthenticatedUser,
    createTestStock
} from "./helpers/tradeosTestUtils.js";

// Orders with prices that have paise (like a moving market will have): money must stay exact to the paisa.
const buy = (user, stock, quantity) =>
    request(app).post("/api/orders").set("Authorization", user.authHeader)
        .send({ stockId: stock._id.toString(), quantity });

const sell = (user, stock, quantity) =>
    request(app).post("/api/orders/sell").set("Authorization", user.authHeader)
        .send({ stockId: stock._id.toString(), quantity });

const balanceOf = async (user) => {
    const response = await request(app).get("/api/wallet").set("Authorization", user.authHeader);
    return response.body.data.balance ?? response.body.data.wallet?.balance;
};

describe("Order money precision", () => {

    it("keeps the balance and order total exact for a price with paise", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(2850.05);

        const response = await buy(user, stock, 3);

        expect(response.status).toBe(201);
        // plain float maths would give 8550.150000000001 here
        expect(response.body.data.order.totalValue).toBe(8550.15);
        expect(response.body.data.transaction.totalValue).toBe(8550.15);
        expect(response.body.data.walletBalance).toBe(91449.85);
        expect(await balanceOf(user)).toBe(91449.85);
    });

    it("returns the actual execution price on the order", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(19.95);

        const response = await buy(user, stock, 2);

        expect(response.body.data.order.price).toBe(19.95);
        expect(response.body.data.transaction.executionPrice).toBe(19.95);
    });

    it("lets a user spend exactly their whole balance", async () => {
        const user = await createAuthenticatedUser();
        // 100000 / 33333.33... is not exact; use a price whose total hits exactly 100000.00 in paise
        const stock = await createTestStock(12500.0);

        const response = await buy(user, stock, 8);

        expect(response.status).toBe(201);
        expect(response.body.data.walletBalance).toBe(0);
        expect(await balanceOf(user)).toBe(0);
    });

    it("rejects an order that costs one paisa more than the balance", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(12500.01);

        const response = await buy(user, stock, 8);

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe("INSUFFICIENT_BALANCE");
        expect(await balanceOf(user)).toBe(100000);
    });

    it("sells back at the same price and returns to the exact starting balance", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(333.33);

        await buy(user, stock, 7);
        const response = await sell(user, stock, 7);

        expect(response.status).toBe(201);
        expect(response.body.data.walletBalance).toBe(100000);
    });

    it("shows profit and loss as exact paise after the price moves", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(100.1);
        await buy(user, stock, 3); // invested 300.30

        stock.currentPrice = 100.35;
        await stock.save();

        const response = await request(app).get("/api/portfolio").set("Authorization", user.authHeader);
        const row = response.body.data.holdings.find((h) => h.stock._id === stock._id.toString());

        expect(row.investedValue).toBe(300.3);
        expect(row.currentValue).toBe(301.05);
        expect(row.unrealizedPnL).toBe(0.75); // 301.05 - 300.30, float maths gives 0.7500000000000227
        expect(response.body.data.summary.totalUnrealizedPnL).toBe(0.75);
    });
});
