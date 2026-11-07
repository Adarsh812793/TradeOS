import { describe, it, expect } from "vitest";
import {
    request,
    app,
    createAuthenticatedUser,
    createTestStock
} from "./helpers/tradeosTestUtils.js";

// Several orders from the same user arriving at the same moment (double click, two tabs, a retry).
// MongoDB aborts one of two transactions that write the same document (a "write conflict").
// That must never surface as a 500, and money must always add up.
const buy = (user, stock, quantity) =>
    request(app).post("/api/orders").set("Authorization", user.authHeader)
        .send({ stockId: stock._id.toString(), quantity });

describe("Simultaneous orders from one user", () => {

    it("every order is either executed or cleanly rejected, and money adds up", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(100);

        const responses = await Promise.all([1, 2, 3, 4, 5].map(() => buy(user, stock, 1)));
        const statuses = responses.map((response) => response.status);

        // no 500s (an unretried write conflict used to show up as one)
        expect(statuses.filter((status) => status >= 500)).toEqual([]);

        const executed = responses.filter((response) => response.status === 201);
        const wallet = await request(app).get("/api/wallet").set("Authorization", user.authHeader);

        // the wallet was charged for exactly the orders that were reported as executed
        expect(wallet.body.data.balance).toBe(100000 - executed.length * 100);

        // and the holding matches the same count
        const holdings = await request(app).get("/api/holdings").set("Authorization", user.authHeader);
        const holding = (holdings.body.data.items ?? holdings.body.data).find(
            (row) => (row.stockId?._id ?? row.stockId) === stock._id.toString()
        );
        expect(holding?.quantity ?? 0).toBe(executed.length);
    });

    it("all five succeed once conflicts are retried", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(100);

        const responses = await Promise.all([1, 2, 3, 4, 5].map(() => buy(user, stock, 1)));

        expect(responses.map((response) => response.status)).toEqual([201, 201, 201, 201, 201]);
    });

    it("simultaneous sells never sell more than the user owns", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(100);
        await buy(user, stock, 3);

        const sells = await Promise.all([1, 2, 3, 4, 5].map(() =>
            request(app).post("/api/orders/sell").set("Authorization", user.authHeader)
                .send({ stockId: stock._id.toString(), quantity: 1 })
        ));
        const statuses = sells.map((response) => response.status);

        expect(statuses.filter((status) => status >= 500)).toEqual([]);
        // exactly 3 shares existed: three sells execute, two are refused for lack of shares
        expect(statuses.filter((status) => status === 201)).toHaveLength(3);
        expect(statuses.filter((status) => status === 400)).toHaveLength(2);

        const wallet = await request(app).get("/api/wallet").set("Authorization", user.authHeader);
        expect(wallet.body.data.balance).toBe(100000);
    });
});
