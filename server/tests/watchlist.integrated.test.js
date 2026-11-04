
import { describe, it, expect } from "vitest";
import {
    request,
    app,
    createAuthenticatedUser,
    createTestStock,
    expectSuccessStatus
} from "./helpers/tradeosTestUtils.js";

describe("Watchlist Integration Tests", () => {
    it("1.1 should add a stock to the watchlist", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock();

        const response = await request(app)
            .post("/api/watchlist")
            .set("Authorization", user.authHeader)
            .send({
                stockId: stock._id.toString()
            });

        expectSuccessStatus(response.status);
    });

    it("1.2 should reject a duplicate watchlist entry", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock();

        const payload = {
            stockId: stock._id.toString()
        };

        const firstResponse = await request(app)
            .post("/api/watchlist")
            .set("Authorization", user.authHeader)
            .send(payload);

        expectSuccessStatus(firstResponse.status);

        const duplicateResponse = await request(app)
            .post("/api/watchlist")
            .set("Authorization", user.authHeader)
            .send(payload);

        expect([400, 409]).toContain(duplicateResponse.status);
    });

    it("1.3 should remove a stock from the watchlist", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock();

        const addResponse = await request(app)
            .post("/api/watchlist")
            .set("Authorization", user.authHeader)
            .send({
                stockId: stock._id.toString()
            });

        expectSuccessStatus(addResponse.status);

        const deleteResponse = await request(app)
            .delete(`/api/watchlist/${stock._id}`)
            .set("Authorization", user.authHeader);

        expect([200, 204]).toContain(deleteResponse.status);
    });
});
