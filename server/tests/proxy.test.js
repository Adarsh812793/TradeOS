import express from "express";
import request from "supertest";
import { describe, it, expect } from "vitest";

import app from "../src/app.js";
import { resolveTrustProxyHops } from "../src/config/proxyConfig.js";
import { createIpRateLimiter } from "../src/middleware/rateLimit.middleware.js";

describe("resolveTrustProxyHops", () => {
    it("is 0 (no proxy) when the setting is missing or empty", () => {
        expect(resolveTrustProxyHops(undefined)).toBe(0);
        expect(resolveTrustProxyHops("")).toBe(0);
    });

    it("reads a whole number written as text, as environment variables always are", () => {
        expect(resolveTrustProxyHops("1")).toBe(1);
        expect(resolveTrustProxyHops("2")).toBe(2);
        expect(resolveTrustProxyHops("0")).toBe(0);
    });

    it("refuses anything that is not a small whole number", () => {
        for (const bad of ["-1", "1.5", "two", "6", "99", "true"]) {
            expect(() => resolveTrustProxyHops(bad), bad).toThrow(/TRUST_PROXY_HOPS/);
        }
    });
});

describe("GET /health", () => {
    it("answers 200 {status: ok} without a login", async () => {
        const response = await request(app).get("/health");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: "ok" });
    });
});

// The reason the setting exists, shown on a tiny app: the same limiter with and without `trust proxy`
describe("rate limiting behind a proxy", () => {
    const buildApp = (trustProxy) => {
        const tiny = express();

        tiny.set("trust proxy", trustProxy);
        tiny.use(createIpRateLimiter({ limit: 2, message: "slow down", skip: () => false }));
        tiny.get("/", (req, res) => res.json({ ip: req.ip }));

        return tiny;
    };

    it("without trust proxy, two different visitors share one counter (the bug)", async () => {
        const tiny = buildApp(0);

        await request(tiny).get("/").set("X-Forwarded-For", "203.0.113.1");
        await request(tiny).get("/").set("X-Forwarded-For", "203.0.113.2");
        const third = await request(tiny).get("/").set("X-Forwarded-For", "203.0.113.3");

        expect(third.status).toBe(429);
    });

    it("with trust proxy 1, each visitor has their own counter and req.ip is the real address", async () => {
        const tiny = buildApp(1);

        await request(tiny).get("/").set("X-Forwarded-For", "203.0.113.1");
        await request(tiny).get("/").set("X-Forwarded-For", "203.0.113.1");
        const blocked = await request(tiny).get("/").set("X-Forwarded-For", "203.0.113.1");
        const other = await request(tiny).get("/").set("X-Forwarded-For", "203.0.113.2");

        expect(blocked.status).toBe(429);
        expect(other.status).toBe(200);
        expect(other.body.ip).toBe("203.0.113.2");
    });

    it("with trust proxy 1 a visitor cannot choose their own address by sending a fake header first", async () => {
        const tiny = buildApp(1);

        // The visitor's own header is "1.1.1.1"; the proxy (trusted) appends the address it really saw: 203.0.113.9.
        // Express believes only the last (trusted) entry, so the forged one does not count.
        const response = await request(tiny).get("/").set("X-Forwarded-For", "1.1.1.1, 203.0.113.9");

        expect(response.body.ip).toBe("203.0.113.9");
    });
});
