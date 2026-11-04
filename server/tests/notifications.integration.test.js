import { describe, it, expect } from "vitest";

import {
    request,
    app,
    createAuthenticatedUser,
    createTestStock
} from "./helpers/tradeosTestUtils.js";

import Notification from "../src/modules/notifications/notification.model.js";

// The password createAuthenticatedUser() registers every test user with.
const PASSWORD = "TestPassword@123";

// Reads the user's notifications through the API (newest first).
const getNotifications = (user, query = "") =>
    request(app)
        .get(`/api/notifications${query}`)
        .set("Authorization", user.authHeader);

// Reads the user's unread count through the API.
const getUnreadCount = async (user) => {
    const response = await request(app)
        .get("/api/notifications/unread-count")
        .set("Authorization", user.authHeader);

    expect(response.status).toBe(200);

    return response.body.data.count;
};

// Places a buy order for the user.
const buy = (user, stock, quantity) =>
    request(app)
        .post("/api/orders")
        .set("Authorization", user.authHeader)
        .send({ stockId: stock._id.toString(), quantity });

describe("Notifications", () => {

    describe("authentication and validation", () => {

        it("rejects requests without a token", async () => {
            const list = await request(app).get("/api/notifications");
            const count = await request(app).get("/api/notifications/unread-count");
            const readAll = await request(app).patch("/api/notifications/read-all");

            expect(list.status).toBe(401);
            expect(count.status).toBe(401);
            expect(readAll.status).toBe(401);
        });

        it("rejects an invalid notification id", async () => {
            const user = await createAuthenticatedUser();

            const response = await request(app)
                .patch("/api/notifications/not-an-id/read")
                .set("Authorization", user.authHeader);

            expect(response.status).toBe(400);
        });
    });

    describe("created by the app", () => {

        it("creates a WELCOME notification when the account is registered", async () => {
            const user = await createAuthenticatedUser();

            const response = await getNotifications(user);

            expect(response.status).toBe(200);
            expect(response.body.data.items).toHaveLength(1);
            expect(response.body.data.items[0]).toMatchObject({
                type: "WELCOME",
                isRead: false,
                link: "/stocks"
            });
            expect(response.body.data.pagination).toMatchObject({
                page: 1,
                limit: 20,
                totalItems: 1
            });
            expect(await getUnreadCount(user)).toBe(1);
        });

        it("creates an ORDER_EXECUTED notification for a buy and for a sell", async () => {
            const user = await createAuthenticatedUser();
            const stock = await createTestStock(100);

            await buy(user, stock, 3);

            const sell = await request(app)
                .post("/api/orders/sell")
                .set("Authorization", user.authHeader)
                .send({ stockId: stock._id.toString(), quantity: 1 });

            expect(sell.status).toBe(201);

            const { items } = (await getNotifications(user)).body.data;
            const orderNotifications = items.filter((n) => n.type === "ORDER_EXECUTED");

            expect(orderNotifications).toHaveLength(2);

            // Newest first: the sell, then the buy
            expect(orderNotifications[0].message).toContain("Sold 1");
            expect(orderNotifications[1].message).toContain("Bought 3");
            expect(orderNotifications[0].link).toBe("/orders");
            expect(orderNotifications[0].metadata.orderId).toBeTruthy();
        });

        it("creates LOW_BALANCE only when a buy crosses below the threshold", async () => {
            const user = await createAuthenticatedUser();

            // 1,00,000 - 96,000 = 4,000: crosses below 5,000
            const expensive = await createTestStock(96000);
            expect((await buy(user, expensive, 1)).status).toBe(201);

            // Balance is already below the threshold, so this buy must NOT notify again
            const cheap = await createTestStock(100);
            expect((await buy(user, cheap, 1)).status).toBe(201);

            const { items } = (await getNotifications(user)).body.data;
            const lowBalance = items.filter((n) => n.type === "LOW_BALANCE");

            expect(lowBalance).toHaveLength(1);
            expect(lowBalance[0].message).toContain("4,000.00");
        });

        it("does not create LOW_BALANCE for a buy that stays above the threshold", async () => {
            const user = await createAuthenticatedUser();
            const stock = await createTestStock(100);

            await buy(user, stock, 1);

            const { items } = (await getNotifications(user)).body.data;

            expect(items.some((n) => n.type === "LOW_BALANCE")).toBe(false);
        });

        it("does not create ORDER_EXECUTED when the order fails", async () => {
            const user = await createAuthenticatedUser();
            const stock = await createTestStock(200000); // more than the wallet holds

            const response = await buy(user, stock, 1);

            expect(response.status).toBe(400);

            const { items } = (await getNotifications(user)).body.data;

            expect(items.map((n) => n.type)).toEqual(["WELCOME"]);
        });

        it("creates a PASSWORD_CHANGED notification", async () => {
            const user = await createAuthenticatedUser();

            const response = await request(app)
                .patch("/api/auth/password")
                .set("Authorization", user.authHeader)
                .send({
                    currentPassword: PASSWORD,
                    newPassword: "BrandNewPass@456"
                });

            expect(response.status).toBe(200);

            const { items } = (await getNotifications(user)).body.data;

            expect(items[0]).toMatchObject({
                type: "PASSWORD_CHANGED",
                link: "/account"
            });
        });

        it("does not create PASSWORD_CHANGED when the current password is wrong", async () => {
            const user = await createAuthenticatedUser();

            const response = await request(app)
                .patch("/api/auth/password")
                .set("Authorization", user.authHeader)
                .send({
                    currentPassword: "WrongPassword@999",
                    newPassword: "BrandNewPass@456"
                });

            expect(response.status).toBe(400);

            const { items } = (await getNotifications(user)).body.data;

            expect(items.some((n) => n.type === "PASSWORD_CHANGED")).toBe(false);
        });
    });

    describe("reading and marking as read", () => {

        it("marks one notification as read and lowers the unread count", async () => {
            const user = await createAuthenticatedUser();
            const stock = await createTestStock(100);
            await buy(user, stock, 1);

            expect(await getUnreadCount(user)).toBe(2);

            const { items } = (await getNotifications(user)).body.data;

            const response = await request(app)
                .patch(`/api/notifications/${items[0]._id}/read`)
                .set("Authorization", user.authHeader);

            expect(response.status).toBe(200);
            expect(response.body.data.isRead).toBe(true);
            expect(response.body.data.readAt).toBeTruthy();
            expect(await getUnreadCount(user)).toBe(1);
        });

        it("marks all notifications as read", async () => {
            const user = await createAuthenticatedUser();
            const stock = await createTestStock(100);
            await buy(user, stock, 1);

            const response = await request(app)
                .patch("/api/notifications/read-all")
                .set("Authorization", user.authHeader);

            expect(response.status).toBe(200);
            expect(response.body.data.updatedCount).toBe(2);
            expect(await getUnreadCount(user)).toBe(0);

            // Running it again has nothing left to update
            const again = await request(app)
                .patch("/api/notifications/read-all")
                .set("Authorization", user.authHeader);

            expect(again.body.data.updatedCount).toBe(0);
        });

        it("cannot mark another user's notification as read", async () => {
            const owner = await createAuthenticatedUser();
            const stranger = await createAuthenticatedUser();

            const { items } = (await getNotifications(owner)).body.data;

            const response = await request(app)
                .patch(`/api/notifications/${items[0]._id}/read`)
                .set("Authorization", stranger.authHeader);

            expect(response.status).toBe(404);
            expect(response.body.errorCode).toBe("NOTIFICATION_NOT_FOUND");
            expect(await getUnreadCount(owner)).toBe(1);
        });

        it("only shows a user their own notifications", async () => {
            const first = await createAuthenticatedUser();
            const second = await createAuthenticatedUser();
            const stock = await createTestStock(100);
            await buy(first, stock, 1);

            const response = await getNotifications(second);

            expect(response.body.data.items).toHaveLength(1);
            expect(response.body.data.items[0].type).toBe("WELCOME");
        });

        it("paginates the list", async () => {
            const user = await createAuthenticatedUser();
            const stock = await createTestStock(100);
            await buy(user, stock, 1);
            await buy(user, stock, 1);

            const response = await getNotifications(user, "?page=1&limit=2");

            expect(response.body.data.items).toHaveLength(2);
            expect(response.body.data.pagination).toMatchObject({
                page: 1,
                limit: 2,
                totalItems: 3,
                totalPages: 2,
                hasNextPage: true,
                hasPreviousPage: false
            });
        });
    });

    describe("account deletion", () => {

        it("deletes the user's notifications together with the account", async () => {
            const user = await createAuthenticatedUser();

            const me = await request(app)
                .get("/api/users/me")
                .set("Authorization", user.authHeader);
            const userId = me.body.data._id;

            expect(await Notification.countDocuments({ userId })).toBe(1);

            const response = await request(app)
                .delete("/api/users/me")
                .set("Authorization", user.authHeader)
                .send({ password: PASSWORD });

            expect(response.status).toBe(200);
            expect(await Notification.countDocuments({ userId })).toBe(0);
        });
    });

    describe("auto-expiry", () => {

        it("has a 30 day TTL index on createdAt", async () => {
            await Notification.init();

            const indexes = await Notification.collection.indexes();
            const ttlIndex = indexes.find(
                (index) => index.key.createdAt === 1 && index.expireAfterSeconds !== undefined
            );

            expect(ttlIndex).toBeDefined();
            expect(ttlIndex.expireAfterSeconds).toBe(60 * 60 * 24 * 30);
        });
    });
});
