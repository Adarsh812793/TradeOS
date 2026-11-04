import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";

import { request, app } from "./helpers/tradeosTestUtils.js";

import config from "../src/config/env.js";
import RefreshSession from "../src/modules/auth/refreshSession.model.js";
import { hashRefreshToken } from "../src/modules/auth/auth.tokens.js";

const PASSWORD = "TestPassword@123";

// Registers a fresh user and logs in. Returns the refresh cookie ("refreshToken=...") and the access token.
const loginFreshUser = async () => {
    const email = `refresh-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

    await request(app)
        .post("/api/auth/register")
        .send({ name: "Refresh Tester", email, password: PASSWORD });

    const response = await request(app)
        .post("/api/auth/login")
        .send({ email, password: PASSWORD });

    return {
        cookie: getCookie(response),
        accessToken: response.body.data.accessToken
    };
};

// Extracts "refreshToken=<value>" from a response's Set-Cookie header.
const getCookie = (response) => {
    const cookies = response.headers["set-cookie"] ?? [];

    return cookies
        .find((value) => value.startsWith("refreshToken="))
        ?.split(";")[0];
};

// Calls POST /api/auth/refresh with a cookie.
const refresh = (cookie) =>
    request(app).post("/api/auth/refresh").set("Cookie", cookie);

// Pretends a token was rotated `secondsAgo` seconds ago (to test the grace period without waiting).
const ageRotation = async (cookie, secondsAgo) => {
    const rawToken = cookie.split("=")[1];

    await RefreshSession.updateOne(
        { tokenHash: hashRefreshToken(rawToken) },
        { $set: { rotatedAt: new Date(Date.now() - secondsAgo * 1000) } }
    );
};

describe("Access token errors (what the frontend uses to decide to renew)", () => {

    it("answers ACCESS_TOKEN_EXPIRED for an expired token", async () => {
        const expired = jwt.sign(
            { userId: "64b000000000000000000000", role: "USER" },
            config.JWT_ACCESS_SECRET,
            { expiresIn: -10 }
        );

        const response = await request(app)
            .get("/api/wallet")
            .set("Authorization", `Bearer ${expired}`);

        expect(response.status).toBe(401);
        expect(response.body.errorCode).toBe("ACCESS_TOKEN_EXPIRED");
    });

    it("answers ACCESS_TOKEN_INVALID for a token with a wrong signature", async () => {
        const forged = jwt.sign(
            { userId: "64b000000000000000000000", role: "USER" },
            "not-the-real-secret"
        );

        const response = await request(app)
            .get("/api/wallet")
            .set("Authorization", `Bearer ${forged}`);

        expect(response.status).toBe(401);
        expect(response.body.errorCode).toBe("ACCESS_TOKEN_INVALID");
    });

    it("sends no renewable errorCode when there is no token at all", async () => {
        const response = await request(app).get("/api/wallet");

        expect(response.status).toBe(401);
        expect(response.body.errorCode).toBeUndefined();
    });

    it("does not use the renewable codes for a wrong password", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({ email: "nobody@example.com", password: PASSWORD });

        expect(response.status).toBe(401);
        expect(response.body.errorCode).toBe("INVALID_CREDENTIALS");
    });
});

describe("Refresh token rotation and the 10 second grace period", () => {

    it("rotates the token and records when it happened", async () => {
        const { cookie } = await loginFreshUser();

        const response = await refresh(cookie);

        expect(response.status).toBe(200);
        expect(getCookie(response)).not.toBe(cookie);

        const oldSession = await RefreshSession.findOne({
            tokenHash: hashRefreshToken(cookie.split("=")[1])
        });

        expect(oldSession.revokedAt).toBeTruthy();
        expect(oldSession.rotatedAt).toBeTruthy();
    });

    it("lets the same old token through once more inside the grace period", async () => {
        const { cookie } = await loginFreshUser();

        const first = await refresh(cookie);
        expect(first.status).toBe(200);

        // e.g. a second tab, or a response that never reached the browser
        const again = await refresh(cookie);
        expect(again.status).toBe(200);
        expect(again.body.data.accessToken).toBeTruthy();

        // the cookie from the grace response keeps working
        const next = await refresh(getCookie(again));
        expect(next.status).toBe(200);
    });

    it("handles two simultaneous refreshes with the same token without logging the user out", async () => {
        const { cookie } = await loginFreshUser();

        const [a, b] = await Promise.all([refresh(cookie), refresh(cookie)]);

        expect(a.status).toBe(200);
        expect(b.status).toBe(200);

        // both new cookies belong to a live login
        expect((await refresh(getCookie(a))).status).toBe(200);
        expect((await refresh(getCookie(b))).status).toBe(200);
    });

    it("treats reuse AFTER the grace period as theft and revokes the whole login", async () => {
        const { cookie } = await loginFreshUser();

        const rotated = await refresh(cookie);
        const newestCookie = getCookie(rotated);

        await ageRotation(cookie, 11); // pretend the rotation happened 11 seconds ago

        const reuse = await refresh(cookie);

        expect(reuse.status).toBe(401);
        expect(reuse.body.errorCode).toBe("REFRESH_TOKEN_REUSE");

        // the legitimate newest token is revoked too: the family is dead
        const afterwards = await refresh(newestCookie);
        expect(afterwards.status).toBe(401);
    });

    it("does not bring a logged-out login back through a recently rotated token", async () => {
        const { cookie: oldCookie } = await loginFreshUser();

        const rotated = await refresh(oldCookie);
        const newestCookie = getCookie(rotated);

        const logout = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", newestCookie);
        expect(logout.status).toBe(200);

        // still inside the 10 second window, but the login was ended on purpose
        const revived = await refresh(oldCookie);

        expect(revived.status).toBe(401);
        expect(revived.body.errorCode).toBe("REFRESH_TOKEN_REUSE");
    });

    it("still rejects an unknown token", async () => {
        const response = await refresh("refreshToken=not-a-real-token");

        expect(response.status).toBe(401);
        expect(response.body.errorCode).toBe("INVALID_REFRESH_TOKEN");
    });
});
