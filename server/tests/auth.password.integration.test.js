
import { describe, it, expect } from "vitest";

import { request, app } from "./helpers/tradeosTestUtils.js";

const OLD_PASSWORD = "OldPassword@123";
const NEW_PASSWORD = "BrandNewPass@456";

// Registers a fresh user through the API and returns their email.
const registerUser = async () => {
    const email = `pw-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

    const response = await request(app)
        .post("/api/auth/register")
        .send({ name: "Password Tester", email, password: OLD_PASSWORD });

    expect(response.status).toBe(201);

    return email;
};

// One login = one device. Returns its access token and its refresh cookie ("refreshToken=...").
const loginDevice = async (email, password = OLD_PASSWORD) => {
    const response = await request(app)
        .post("/api/auth/login")
        .send({ email, password });

    const setCookie = response.headers["set-cookie"] ?? [];
    const cookie = setCookie
        .find((value) => value.startsWith("refreshToken="))
        ?.split(";")[0];

    return { status: response.status, accessToken: response.body.data?.accessToken, cookie };
};

// Sends PATCH /api/auth/password as a device (with or without its refresh cookie).
const changePassword = (device, body, { withCookie = true } = {}) => {
    const call = request(app)
        .patch("/api/auth/password")
        .set("Authorization", `Bearer ${device.accessToken}`);

    if (withCookie && device.cookie) {
        call.set("Cookie", device.cookie);
    }

    return call.send(body);
};

// Asks for a new access token with a device's refresh cookie.
const refresh = (cookie) =>
    request(app).post("/api/auth/refresh").set("Cookie", cookie);

describe("PATCH /api/auth/password", () => {

    it("1.1 should change the password: the new one works and the old one stops working", async () => {
        const email = await registerUser();
        const device = await loginDevice(email);

        const response = await changePassword(device, {
            currentPassword: OLD_PASSWORD,
            newPassword: NEW_PASSWORD
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.signedOutOtherDevices).toBe(0);

        expect((await loginDevice(email, NEW_PASSWORD)).status).toBe(200);
        expect((await loginDevice(email, OLD_PASSWORD)).status).toBe(401);
    });

    it("1.2 should reject a wrong current password and change nothing", async () => {
        const email = await registerUser();
        const device = await loginDevice(email);

        const response = await changePassword(device, {
            currentPassword: "NotMyPassword!1",
            newPassword: NEW_PASSWORD
        });

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe("INVALID_CURRENT_PASSWORD");

        expect((await loginDevice(email, OLD_PASSWORD)).status).toBe(200);
        expect((await loginDevice(email, NEW_PASSWORD)).status).toBe(401);
    });

    it("1.3 should reject a new password that is the same as the current one", async () => {
        const email = await registerUser();
        const device = await loginDevice(email);

        const response = await changePassword(device, {
            currentPassword: OLD_PASSWORD,
            newPassword: OLD_PASSWORD
        });

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe("PASSWORD_UNCHANGED");
    });

    it("1.4 should reject a too-short new password and missing fields", async () => {
        const email = await registerUser();
        const device = await loginDevice(email);

        const tooShort = await changePassword(device, {
            currentPassword: OLD_PASSWORD,
            newPassword: "short"
        });
        const noCurrent = await changePassword(device, { newPassword: NEW_PASSWORD });
        const noNew = await changePassword(device, { currentPassword: OLD_PASSWORD });

        expect(tooShort.status).toBe(400);
        expect(tooShort.body.errorCode).toBe("VALIDATION_ERROR");
        expect(tooShort.body.message).toContain("New password must be at least 8 characters");
        expect(noCurrent.status).toBe(400);
        expect(noNew.status).toBe(400);
    });

    it("1.5 should reject a request without a login", async () => {
        const response = await request(app)
            .patch("/api/auth/password")
            .send({ currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD });

        expect(response.status).toBe(401);
    });

    it("1.6 should sign out the other devices but keep this one logged in", async () => {
        const email = await registerUser();
        const thisDevice = await loginDevice(email);
        const otherDevice = await loginDevice(email);

        const response = await changePassword(thisDevice, {
            currentPassword: OLD_PASSWORD,
            newPassword: NEW_PASSWORD
        });

        expect(response.status).toBe(200);
        expect(response.body.data.signedOutOtherDevices).toBe(1);

        // The other device can no longer renew its login ...
        expect((await refresh(otherDevice.cookie)).status).toBe(401);

        // ... while this device still can
        expect((await refresh(thisDevice.cookie)).status).toBe(200);
    });

    it("1.7 should sign out every device when the request carries no refresh cookie", async () => {
        const email = await registerUser();
        const deviceA = await loginDevice(email);
        const deviceB = await loginDevice(email);

        const response = await changePassword(
            deviceA,
            { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD },
            { withCookie: false }
        );

        expect(response.status).toBe(200);
        expect(response.body.data.signedOutOtherDevices).toBe(2);

        expect((await refresh(deviceA.cookie)).status).toBe(401);
        expect((await refresh(deviceB.cookie)).status).toBe(401);
    });

    it("1.8 should not touch another user's logins", async () => {
        const email = await registerUser();
        const device = await loginDevice(email);

        const bystanderEmail = await registerUser();
        const bystander = await loginDevice(bystanderEmail);

        await changePassword(device, {
            currentPassword: OLD_PASSWORD,
            newPassword: NEW_PASSWORD
        });

        expect((await refresh(bystander.cookie)).status).toBe(200);
    });

    it("1.9 should stop after 5 wrong attempts, even for the right password", async () => {
        const email = await registerUser();
        const device = await loginDevice(email);

        for (let attempt = 1; attempt <= 5; attempt++) {
            const wrong = await changePassword(device, {
                currentPassword: `WrongGuess${attempt}!`,
                newPassword: NEW_PASSWORD
            });

            expect(wrong.status).toBe(400);
        }

        const blocked = await changePassword(device, {
            currentPassword: OLD_PASSWORD,
            newPassword: NEW_PASSWORD
        });

        expect(blocked.status).toBe(429);

        // The password was not changed
        expect((await loginDevice(email, OLD_PASSWORD)).status).toBe(200);
    });

    it("1.10 should never return a password hash", async () => {
        const email = await registerUser();
        const device = await loginDevice(email);

        const response = await changePassword(device, {
            currentPassword: OLD_PASSWORD,
            newPassword: NEW_PASSWORD
        });

        expect(JSON.stringify(response.body)).not.toMatch(/argon2|passwordHash/i);
    });
});
