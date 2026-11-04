
import { describe, it, expect } from "vitest";
import {
    request,
    app,
    createAuthenticatedUser
} from "./helpers/tradeosTestUtils.js";

describe("Wallet Integration Tests", () => {
    it("1.1 should retrieve the authenticated user's wallet", async () => {
        const user = await createAuthenticatedUser();

        const response = await request(app)
            .get("/api/wallet")
            .set("Authorization", user.authHeader);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
    });

    it("1.2 should reject wallet access without authentication", async () => {
        const response = await request(app)
            .get("/api/wallet");

        expect([401, 403]).toContain(response.status);
    });
});
