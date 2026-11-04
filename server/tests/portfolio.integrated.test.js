
import { describe, it, expect } from "vitest";
import {
    request,
    app,
    createAuthenticatedUser
} from "./helpers/tradeosTestUtils.js";

describe("Portfolio Integration Tests", () => {
    it("1.1 should retrieve the authenticated user's portfolio", async () => {
        const user = await createAuthenticatedUser();

        const response = await request(app)
            .get("/api/portfolio")
            .set("Authorization", user.authHeader);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
    });

    it("1.2 should reject portfolio access without authentication", async () => {
        const response = await request(app)
            .get("/api/portfolio");

        expect([401, 403]).toContain(response.status);
    });
});
