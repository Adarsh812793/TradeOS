import { expectSuccessStatus } from "./helpers/tradeosTestUtils.js";
import { describe, it, expect } from "vitest";
import {
    request,
    app,
    createAuthenticatedUser,
    createTestStock
} from "./helpers/tradeosTestUtils.js";

describe("Orders Integration Tests", () => {
    it("1.1 should buy a stock successfully", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(100);

        const response = await request(app)
            .post("/api/orders")
            .set("Authorization", user.authHeader)
            .send({
                stockId: stock._id.toString(),
                quantity: 2
            });

        expectSuccessStatus(response.status);
    });

    it("1.2 should reject a buy order with insufficient balance", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(100);

        const response = await request(app)
            .post("/api/orders")
            .set("Authorization", user.authHeader)
            .send({
                stockId: stock._id.toString(),
                quantity: 2000
            });

        expect([400, 409]).toContain(response.status);
    });

    it("1.3 should sell previously purchased shares", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(100);

        const buyResponse = await request(app)
            .post("/api/orders")
            .set("Authorization", user.authHeader)
            .send({
                stockId: stock._id.toString(),
                quantity: 2
            });

        expectSuccessStatus(buyResponse.status);

        const sellResponse = await request(app)
            .post("/api/orders/sell")
            .set("Authorization", user.authHeader)
            .send({
                stockId: stock._id.toString(),
                quantity: 1
            });

        expectSuccessStatus(sellResponse.status);
    });

    it("1.4 should reject an invalid order quantity", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock();

        const response = await request(app)
            .post("/api/orders")
            .set("Authorization", user.authHeader)
            .send({
                stockId: stock._id.toString(),
                quantity: 0
            });

        expect([400, 422]).toContain(response.status);
    });
});
