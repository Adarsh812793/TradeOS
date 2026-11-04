
import { describe, it, expect } from "vitest";
import { request, app, createTestStock } from "./helpers/tradeosTestUtils.js";

describe("Stocks Integration Tests", () => {
    it("1.1 should retrieve all stocks", async () => {
        await createTestStock();

        const response = await request(app)
            .get("/api/stocks");

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
    });

    it("1.2 should retrieve a stock by ID", async () => {
        const stock = await createTestStock();

        const response = await request(app)
            .get(`/api/stocks/${stock._id}`);

        expect(response.status).toBe(200);
    });

    it("1.3 should reject an invalid stock ID", async () => {
        const response = await request(app)
            .get("/api/stocks/invalid-id");

        expect([400, 422]).toContain(response.status);
    });
});
