import request from "supertest";
import { describe, it, expect } from "vitest";

import app from "../src/app.js";

// TEMPORARY: goes away together with the /api/debug/ip route
describe("GET /api/debug/ip", () => {
    it("echoes the caller's connection details and the proxy header it received", async () => {
        const response = await request(app).get("/api/debug/ip").set("X-Forwarded-For", "203.0.113.7");

        expect(response.status).toBe(200);
        expect(response.body.trustProxyHops).toBe(0);
        expect(response.body.xForwardedFor).toBe("203.0.113.7");
        // with 0 trusted proxies the header is ignored: ip is the connection itself, not the header
        expect(response.body.ip).not.toBe("203.0.113.7");
    });
});
