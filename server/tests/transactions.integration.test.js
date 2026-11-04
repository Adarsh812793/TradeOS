
import { describe, it, expect } from "vitest";
import {
    request,
    app,
    createAuthenticatedUser,
    createTestStock,
    expectSuccessStatus
} from "./helpers/tradeosTestUtils.js";

describe("Transactions Integration Tests", () => {
    it("1.1 should retrieve transaction history after a successful buy", async () => {
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

        const response = await request(app)
            .get("/api/transactions")
            .set("Authorization", user.authHeader);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        // No page / limit sent: the validate() middleware must apply its defaults as numbers
        expect(response.body.data.pagination).toMatchObject({
            page: 1,
            limit: 20,
            totalItems: 1
        });
    });
});
