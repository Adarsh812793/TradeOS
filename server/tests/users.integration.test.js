
import { describe, it, expect } from "vitest";

import {
    request,
    app,
    createAuthenticatedUser
} from "./helpers/tradeosTestUtils.js";

// Sends PATCH /api/users/me as the given user.
const updateProfile = (user, body) =>
    request(app)
        .patch("/api/users/me")
        .set("Authorization", user.authHeader)
        .send(body);

// Reads the profile back through GET /api/users/me.
const getProfile = (user) =>
    request(app)
        .get("/api/users/me")
        .set("Authorization", user.authHeader);

describe("Users Integration Tests", () => {

    describe("GET /api/users/me", () => {
        it("1.1 should return the profile without the password hash", async () => {
            const user = await createAuthenticatedUser();

            const response = await getProfile(user);

            expect(response.status).toBe(200);
            expect(response.body.data.email).toBe(user.email);
            expect(response.body.data.passwordHash).toBeUndefined();
        });
    });

    describe("PATCH /api/users/me", () => {
        it("2.1 should update the name and return the updated profile", async () => {
            const user = await createAuthenticatedUser();

            const response = await updateProfile(user, { name: "Updated Name" });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe("Updated Name");
            expect(response.body.data.passwordHash).toBeUndefined();

            // The change is really saved, not just echoed back
            const profile = await getProfile(user);
            expect(profile.body.data.name).toBe("Updated Name");
        });

        it("2.2 should trim spaces around the name", async () => {
            const user = await createAuthenticatedUser();

            const response = await updateProfile(user, { name: "   Spaced Name   " });

            expect(response.status).toBe(200);
            expect(response.body.data.name).toBe("Spaced Name");
        });

        it("2.3 should reject a name that is too short", async () => {
            const user = await createAuthenticatedUser();

            const response = await updateProfile(user, { name: "A" });

            expect(response.status).toBe(400);
            expect(response.body.errorCode).toBe("VALIDATION_ERROR");
        });

        it("2.4 should reject a name longer than 50 characters", async () => {
            const user = await createAuthenticatedUser();

            const response = await updateProfile(user, { name: "A".repeat(51) });

            expect(response.status).toBe(400);
            expect(response.body.errorCode).toBe("VALIDATION_ERROR");
        });

        it("2.5 should reject a missing or blank name", async () => {
            const user = await createAuthenticatedUser();

            const missing = await updateProfile(user, {});
            const blank = await updateProfile(user, { name: "   " });

            expect(missing.status).toBe(400);
            expect(blank.status).toBe(400);
        });

        it("2.6 should not let the email be changed through this endpoint", async () => {
            const user = await createAuthenticatedUser();

            const response = await updateProfile(user, {
                name: "Valid Name",
                email: "someone-else@example.com"
            });

            expect(response.status).toBe(200);

            const profile = await getProfile(user);
            expect(profile.body.data.email).toBe(user.email);
        });

        it("2.7 should reject an update without authentication", async () => {
            const response = await request(app)
                .patch("/api/users/me")
                .send({ name: "No Token" });

            expect(response.status).toBe(401);
        });
    });
});
