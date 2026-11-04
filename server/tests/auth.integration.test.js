
import { describe, it, expect } from "vitest";

import {
    request,
    app,
    createAuthenticatedUser
} from "./helpers/tradeosTestUtils.js";

import User from "../src/modules/users/user.model.js";
import Wallet from "../src/modules/wallet/wallet.model.js";
import RefreshSession from "../src/modules/auth/refreshSession.model.js";

// Creates unique test-user details for each test.
const createTestUser = () => ({
    name: "Test User",
    email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: "TestPassword123!"
});

// Registers a test user through the actual API.
const registerTestUser = async (user = createTestUser()) => {
    const response = await request(app)
        .post("/api/auth/register")
        .send(user);

    return { user, response };
};

// Logs in a user through the actual API.
const loginTestUser = async (user) => {
    return request(app)
        .post("/api/auth/login")
        .send({
            email: user.email,
            password: user.password
        });
};

// Extracts the access token from the response.
const getAccessToken = (response) => {
    return response.body.data?.accessToken ?? response.body.accessToken;
};

// Extracts the refresh-token cookie from the response.
const getRefreshCookie = (response) => {
    const cookies = response.headers["set-cookie"] ?? [];
    return cookies.find((cookie) => cookie.startsWith("refreshToken="));
};

describe("Auth Integration Tests", () => {

    // ============================================================
    // 1. Tests on auth/register route
    // ============================================================

    it("1.1 should register a new user successfully", async () => {
        const user = createTestUser();

        const response = await request(app)
            .post("/api/auth/register")
            .send(user);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);

        const savedUser = await User.findOne({ email: user.email });
        expect(savedUser).not.toBeNull();
    });

    it("1.2 should create a wallet with the default balance", async () => {
        const { user, response } = await registerTestUser();

        expect(response.status).toBe(201);

        const savedUser = await User.findOne({ email: user.email });
        const wallet = await Wallet.findOne({ userId: savedUser._id });

        expect(wallet).not.toBeNull();
        expect(wallet.balance).toBe(100000);
    });

    it("1.3 should store a hashed password instead of plain text", async () => {
        const { user, response } = await registerTestUser();

        expect(response.status).toBe(201);

        const savedUser = await User.findOne({ email: user.email });

        expect(savedUser.passwordHash).not.toBe(user.password);
        expect(savedUser.passwordHash).toMatch(/^\$argon2/);
    });

    it("1.4 should reject registration with an already registered email", async () => {
        const user = createTestUser();

        const firstResponse = await request(app)
            .post("/api/auth/register")
            .send(user);

        expect(firstResponse.status).toBe(201);

        const duplicateResponse = await request(app)
            .post("/api/auth/register")
            .send(user);

        expect(duplicateResponse.status).toBe(409);

        const users = await User.countDocuments({ email: user.email });
        expect(users).toBe(1);
    });

    it("1.5 should reject missing or invalid registration fields", async () => {
        const validUser = createTestUser();

        const invalidRequests = [
            { email: validUser.email, password: validUser.password },
            { name: validUser.name, password: validUser.password },
            { name: validUser.name, email: "invalid-email", password: validUser.password },
            { name: validUser.name, email: validUser.email }
        ];

        for (const payload of invalidRequests) {
            const response = await request(app)
                .post("/api/auth/register")
                .send(payload);

            expect(response.status).toBe(400);
        }

        const savedUser = await User.findOne({ email: validUser.email });
        expect(savedUser).toBeNull();
    });


    // ============================================================
    // 2. Tests on auth/login route
    // ============================================================

    it("2.1 should log in successfully with valid credentials", async () => {
        const user = createTestUser();
        await registerTestUser(user);

        const response = await loginTestUser(user);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    it("2.2 should return an access token and set a refresh-token cookie", async () => {
        const user = createTestUser();
        await registerTestUser(user);

        const response = await loginTestUser(user);

        expect(response.status).toBe(200);
        expect(getAccessToken(response)).toBeTruthy();

        const refreshCookie = getRefreshCookie(response);
        expect(refreshCookie).toBeTruthy();
        expect(refreshCookie.toLowerCase()).toContain("httponly");
    });

    it("2.3 should reject login with an incorrect email or password", async () => {
        const user = createTestUser();
        await registerTestUser(user);

        const unknownEmailResponse = await loginTestUser({
            ...user,
            email: `unknown-${user.email}`
        });

        const incorrectPasswordResponse = await loginTestUser({
            ...user,
            password: "WrongPassword123!"
        });

        expect(unknownEmailResponse.status).toBe(401);
        expect(incorrectPasswordResponse.status).toBe(401);
    });

    it("2.4 should reject missing or invalid login fields", async () => {
        const invalidRequests = [
            {},
            { email: "invalid-email", password: "TestPassword123!" },
            { email: "test@example.com" },
            { password: "TestPassword123!" }
        ];

        for (const payload of invalidRequests) {
            const response = await request(app)
                .post("/api/auth/login")
                .send(payload);

            expect(response.status).toBe(400);
        }
    });


    // ============================================================
    // 3. Tests on auth/refresh route
    // ============================================================

    it("3.1 should issue a new access token with a valid refresh cookie", async () => {
        const user = createTestUser();
        await registerTestUser(user);

        const loginResponse = await loginTestUser(user);
        expect(loginResponse.status).toBe(200);

        const refreshCookie = getRefreshCookie(loginResponse);
        expect(refreshCookie).toBeTruthy();

        const refreshResponse = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", refreshCookie.split(";")[0]);

        expect(refreshResponse.status).toBe(200);
        expect(getAccessToken(refreshResponse)).toBeTruthy();
    });

    it("3.2 should rotate the refresh token after a successful refresh", async () => {
        const user = createTestUser();
        await registerTestUser(user);

        const loginResponse = await loginTestUser(user);
        const oldCookie = getRefreshCookie(loginResponse);

        expect(oldCookie).toBeTruthy();

        const refreshResponse = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", oldCookie.split(";")[0]);

        expect(refreshResponse.status).toBe(200);

        const newCookie = getRefreshCookie(refreshResponse);
        expect(newCookie).toBeTruthy();
        expect(newCookie.split(";")[0]).not.toBe(oldCookie.split(";")[0]);
    });

    it("3.3 should reject a missing or invalid refresh cookie", async () => {
        const missingCookieResponse = await request(app)
            .post("/api/auth/refresh");

        expect([400, 401]).toContain(missingCookieResponse.status);

        const invalidCookieResponse = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", ["refreshToken=invalid-token"]);

        expect([400, 401]).toContain(invalidCookieResponse.status);
    });


    // ============================================================
    // 4. Tests on auth/logout route
    // ============================================================

    it("4.1 should log out and revoke the refresh session", async () => {
        const user = createTestUser();
        await registerTestUser(user);

        const loginResponse = await loginTestUser(user);
        const refreshCookie = getRefreshCookie(loginResponse);

        expect(refreshCookie).toBeTruthy();

        const logoutResponse = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", refreshCookie.split(";")[0]);

        expect(logoutResponse.status).toBe(200);

        const savedUser = await User.findOne({ email: user.email });
        const sessions = await RefreshSession.find({ userId: savedUser._id });

        expect(sessions.length).toBeGreaterThan(0);
        expect(sessions.some((session) => session.revokedAt != null)).toBe(true);
    });

    it("4.2 should clear the refresh-token cookie after logout", async () => {
        const user = createTestUser();
        await registerTestUser(user);

        const loginResponse = await loginTestUser(user);
        const refreshCookie = getRefreshCookie(loginResponse);

        const logoutResponse = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", refreshCookie.split(";")[0]);

        expect(logoutResponse.status).toBe(200);

        const cookies = logoutResponse.headers["set-cookie"] ?? [];
        const clearedCookie = cookies.find((cookie) =>
            cookie.startsWith("refreshToken=")
        );

        expect(clearedCookie).toMatch(/expires=/i);
        expect(clearedCookie).toMatch(/01 jan 1970/i);
    });

    it("4.3 should reject reuse of a refresh token after logout", async () => {
        const user = createTestUser();
        await registerTestUser(user);

        const loginResponse = await loginTestUser(user);
        const refreshCookie = getRefreshCookie(loginResponse);

        const cookieValue = refreshCookie.split(";")[0];

        const logoutResponse = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", cookieValue);

        expect(logoutResponse.status).toBe(200);

        const refreshResponse = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", cookieValue);

        expect(refreshResponse.status).toBe(401);
    });


    // ============================================================
    // 5. Tests on protected authentication routes
    // ============================================================

    it("5.1 should reject missing or invalid access tokens", async () => {
        const missingTokenResponse = await request(app)
            .get("/api/users/me");

        const invalidTokenResponse = await request(app)
            .get("/api/users/me")
            .set("Authorization", "Bearer invalid-token");

        expect(missingTokenResponse.status).toBe(401);
        expect(invalidTokenResponse.status).toBe(401);
    });

    it("5.2 should allow access to a protected route with a valid access token", async () => {
        const { authHeader } = await createAuthenticatedUser();

        const response = await request(app)
            .get("/api/users/me")
            .set("Authorization", authHeader);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

});
