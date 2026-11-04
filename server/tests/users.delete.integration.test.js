
import { describe, it, expect } from "vitest";

import {
    request,
    app,
    createAuthenticatedUser,
    createTestStock
} from "./helpers/tradeosTestUtils.js";

import User from "../src/modules/users/user.model.js";
import Wallet from "../src/modules/wallet/wallet.model.js";
import Holding from "../src/modules/holdings/holding.model.js";
import Order from "../src/modules/orders/order.model.js";
import Transaction from "../src/modules/transactions/transaction.model.js";
import Watchlist from "../src/modules/watchlist/watchlist.model.js";
import RefreshSession from "../src/modules/auth/refreshSession.model.js";

// The password createAuthenticatedUser() registers every test user with.
const PASSWORD = "TestPassword@123";

// Reads the user's database id through the API.
const getUserId = async (user) => {
    const response = await request(app)
        .get("/api/users/me")
        .set("Authorization", user.authHeader);

    return response.body.data._id;
};

// Gives the user one of everything: a holding + an order + a transaction (one buy) and a watchlist entry.
const addActivity = async (user) => {
    const stock = await createTestStock(100);

    const buy = await request(app)
        .post("/api/orders")
        .set("Authorization", user.authHeader)
        .send({ stockId: stock._id.toString(), quantity: 2 });

    expect(buy.status).toBe(201);

    const watch = await request(app)
        .post("/api/watchlist")
        .set("Authorization", user.authHeader)
        .send({ stockId: stock._id.toString() });

    expect(watch.status).toBe(201);
};

// How many documents of every kind belong to this user.
const countsFor = async (userId) => ({
    user: await User.countDocuments({ _id: userId }),
    wallet: await Wallet.countDocuments({ userId }),
    holdings: await Holding.countDocuments({ userId }),
    orders: await Order.countDocuments({ userId }),
    transactions: await Transaction.countDocuments({ userId }),
    watchlist: await Watchlist.countDocuments({ userId }),
    sessions: await RefreshSession.countDocuments({ userId })
});

// Sends DELETE /api/users/me as the given user.
const deleteAccount = (user, body) =>
    request(app)
        .delete("/api/users/me")
        .set("Authorization", user.authHeader)
        .send(body);

describe("DELETE /api/users/me", () => {

    it("1.1 should delete the account and everything that belongs to it", async () => {
        const user = await createAuthenticatedUser();
        await addActivity(user);
        const userId = await getUserId(user);

        // Everything exists first (otherwise "deleted" would prove nothing)
        const before = await countsFor(userId);
        expect(before).toEqual({
            user: 1,
            wallet: 1,
            holdings: 1,
            orders: 1,
            transactions: 1,
            watchlist: 1,
            sessions: 1
        });

        const response = await deleteAccount(user, { password: PASSWORD });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        expect(await countsFor(userId)).toEqual({
            user: 0,
            wallet: 0,
            holdings: 0,
            orders: 0,
            transactions: 0,
            watchlist: 0,
            sessions: 0
        });
    });

    it("1.2 should not touch anybody else's data", async () => {
        const user = await createAuthenticatedUser();
        const bystander = await createAuthenticatedUser();

        await addActivity(user);
        await addActivity(bystander);

        const bystanderId = await getUserId(bystander);
        const bystanderBefore = await countsFor(bystanderId);

        const response = await deleteAccount(user, { password: PASSWORD });
        expect(response.status).toBe(200);

        expect(await countsFor(bystanderId)).toEqual(bystanderBefore);
        expect(bystanderBefore.orders).toBe(1);
    });

    it("1.3 should reject a wrong password and delete nothing", async () => {
        const user = await createAuthenticatedUser();
        await addActivity(user);
        const userId = await getUserId(user);
        const before = await countsFor(userId);

        const response = await deleteAccount(user, { password: "NotMyPassword!1" });

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe("INVALID_PASSWORD");
        expect(await countsFor(userId)).toEqual(before);
    });

    it("1.4 should reject a missing or blank password", async () => {
        const user = await createAuthenticatedUser();

        const missing = await deleteAccount(user, {});
        const blank = await deleteAccount(user, { password: "" });

        expect(missing.status).toBe(400);
        expect(missing.body.errorCode).toBe("VALIDATION_ERROR");
        expect(blank.status).toBe(400);

        // Still there
        const profile = await request(app)
            .get("/api/users/me")
            .set("Authorization", user.authHeader);
        expect(profile.status).toBe(200);
    });

    it("1.5 should reject a request without a login", async () => {
        const response = await request(app)
            .delete("/api/users/me")
            .send({ password: PASSWORD });

        expect(response.status).toBe(401);
    });

    it("1.6 should remove the login cookie from the browser", async () => {
        const user = await createAuthenticatedUser();

        const response = await deleteAccount(user, { password: PASSWORD });

        const cookies = response.headers["set-cookie"] ?? [];
        const cleared = cookies.find((cookie) => cookie.startsWith("refreshToken=;"));

        expect(cleared).toBeTruthy();
        expect(cleared).toContain("Expires=Thu, 01 Jan 1970");
    });

    it("1.7 should stop working with the old login afterwards", async () => {
        const user = await createAuthenticatedUser();

        await deleteAccount(user, { password: PASSWORD });

        // Logging in again fails ...
        const login = await request(app)
            .post("/api/auth/login")
            .send({ email: user.email, password: PASSWORD });
        expect(login.status).toBe(401);

        // ... and the old access token (valid for up to 15 minutes) finds no user
        const profile = await request(app)
            .get("/api/users/me")
            .set("Authorization", user.authHeader);
        expect(profile.status).toBe(404);
        expect(profile.body.errorCode).toBe("USER_NOT_FOUND");
    });

    it("1.7b should not let the old login create anything for the deleted user", async () => {
        const user = await createAuthenticatedUser();
        const stock = await createTestStock(100);
        const userId = await getUserId(user);

        await deleteAccount(user, { password: PASSWORD });

        // The old access token still passes the login check for a while, but must not leave records behind
        const watch = await request(app)
            .post("/api/watchlist")
            .set("Authorization", user.authHeader)
            .send({ stockId: stock._id.toString() });

        const buy = await request(app)
            .post("/api/orders")
            .set("Authorization", user.authHeader)
            .send({ stockId: stock._id.toString(), quantity: 1 });

        expect(watch.status).toBe(404);
        expect(buy.status).toBe(404);
        expect(await countsFor(userId)).toEqual({
            user: 0,
            wallet: 0,
            holdings: 0,
            orders: 0,
            transactions: 0,
            watchlist: 0,
            sessions: 0
        });
    });

    it("1.8 should let the same email register again", async () => {
        const user = await createAuthenticatedUser();

        await deleteAccount(user, { password: PASSWORD });

        const register = await request(app)
            .post("/api/auth/register")
            .send({ name: "Back Again", email: user.email, password: PASSWORD });

        expect(register.status).toBe(201);
    });

    it("1.9 should stop after 5 wrong passwords, even for the right one", async () => {
        const user = await createAuthenticatedUser();
        const userId = await getUserId(user);

        for (let attempt = 1; attempt <= 5; attempt++) {
            const wrong = await deleteAccount(user, { password: `WrongGuess${attempt}!` });
            expect(wrong.status).toBe(400);
        }

        const blocked = await deleteAccount(user, { password: PASSWORD });

        expect(blocked.status).toBe(429);
        expect((await countsFor(userId)).user).toBe(1);
    });
});
