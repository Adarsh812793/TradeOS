import { describe, it, expect } from "vitest";
import express from "express";

import { request } from "./helpers/tradeosTestUtils.js";

import {
    AUTH_RATE_LIMIT,
    REFRESH_RATE_LIMIT,
    createIpRateLimiter
} from "../src/middleware/rateLimit.middleware.js";

// A tiny app with one route behind an ACTIVE limiter (the real ones are switched off when NODE_ENV=test).
const buildAppWithLimiter = (limit) => {
    const app = express();

    app.post(
        "/limited",
        createIpRateLimiter({ limit, message: "Too many requests", skip: () => false }),
        (req, res) => res.status(200).json({ success: true })
    );

    return app;
};

describe("Auth rate limiting", () => {

    it("allows 10 login / register requests per IP in 15 minutes", () => {
        expect(AUTH_RATE_LIMIT).toBe(10);
    });

    it("blocks the 11th request with 429 and the standard message", async () => {
        const app = buildAppWithLimiter(AUTH_RATE_LIMIT);

        for (let attempt = 1; attempt <= AUTH_RATE_LIMIT; attempt++) {
            const response = await request(app).post("/limited");
            expect(response.status).toBe(200);
        }

        const blocked = await request(app).post("/limited");

        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual({
            success: false,
            message: "Too many requests"
        });
    });

    it("keeps token renewal on its own, looser limit", () => {
        expect(REFRESH_RATE_LIMIT).toBeGreaterThan(AUTH_RATE_LIMIT);
    });

    it("is switched off for the real routes while testing, so the suite can register many users", async () => {
        for (let attempt = 0; attempt < AUTH_RATE_LIMIT + 3; attempt++) {
            const response = await request((await import("../src/app.js")).default)
                .post("/api/auth/login")
                .send({ email: "nobody@example.com", password: "TestPassword@123" });

            expect(response.status).toBe(401); // wrong credentials, never 429
        }
    });
});
