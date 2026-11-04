
import { describe, it, expect } from "vitest";
import {
    request,
    app,
    createAuthenticatedUser,
    createTestStock,
    expectSuccessStatus
} from "./helpers/tradeosTestUtils.js";

describe("Holdings Integration Tests", () => {
    it("1.1 should retrieve holdings after buying a stock", async () => {
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
            .get("/api/holdings")
            .set("Authorization", user.authHeader);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
    });
});
