import { describe, it, expect, beforeEach, vi } from "vitest";

import Notification from "../src/modules/notifications/notification.model.js";
import PasswordReset from "../src/modules/auth/passwordReset.model.js";
import RefreshSession from "../src/modules/auth/refreshSession.model.js";
import User from "../src/modules/users/user.model.js";
import * as emailProvider from "../src/modules/email/email.provider.js";
import { clearOutbox, getLastEmailTo, getOutbox } from "../src/modules/email/memory.provider.js";
import { request, app, signUpUser } from "./helpers/tradeosTestUtils.js";

// Forgot password: ask for an emailed code (POST /api/auth/password/forgot) and reset with it (POST /password/reset).
// The emails go to the in-memory provider, and they are sent in the background, so the tests wait for them to arrive.

const PASSWORD = "Sup3rSecret!pass";
const NEW_PASSWORD = "BrandNew!pass123";
const SAME_FAILURE = "That code is not correct, or it has expired. Ask for a new one.";
const uniqueEmail = () => `reset-${Date.now()}${Math.floor(Math.random() * 100000)}@example.com`;

const forgot = (email) => request(app).post("/api/auth/password/forgot").send({ email });
const reset = (email, code, newPassword = NEW_PASSWORD) => request(app).post("/api/auth/password/reset").send({ email, code, newPassword });
const login = (email, password) => request(app).post("/api/auth/login").send({ email, password });

const emailsTo = (email, subjectPart) => getOutbox().filter((m) => m.to === email && m.subject.includes(subjectPart));
const wrongCodeFor = (code) => (code === "111111" ? "222222" : "111111");
const pastCooldown = (email) => PasswordReset.updateOne({ email }, { $set: { lastSentAt: new Date(Date.now() - 61 * 1000) } });
const nothingArrives = () => new Promise((resolve) => setTimeout(resolve, 400));
const cookieOf = (response) => response.headers["set-cookie"].find((c) => c.startsWith("refreshToken=")).split(";")[0];

// Waits for the (background) reset-code email number `count` to arrive and returns its 6 digits
async function emailedCode(email, count = 1) {
    await vi.waitFor(() => expect(emailsTo(email, "reset code")).toHaveLength(count));

    return getLastEmailTo(email).text.match(/\b(\d{6})\b/)[1];
}

// A real account (made through the emailed sign-up), still logged in on one device, and its reset code
async function accountWithCode() {
    const email = uniqueEmail();
    const signedUp = await signUpUser({ name: "Asha Rao", email, password: PASSWORD, keepSession: true });
    expect(signedUp.status).toBe(201);

    const asked = await forgot(email);
    expect(asked.status).toBe(202);

    return { email, code: await emailedCode(email), cookie: cookieOf(signedUp) };
}

describe("POST /api/auth/password/forgot", () => {
    beforeEach(() => clearOutbox());

    it("emails a 6-digit code to an account that exists, and keeps only a hash of it", async () => {
        const { email, code } = await accountWithCode();

        const record = await PasswordReset.findOne({ email });
        const mail = getLastEmailTo(email);

        expect(mail.subject).toBe("Your TradeOS password reset code");
        expect(mail.subject).not.toMatch(/\d{6}/);
        expect(record.codeHash).toMatch(/^[0-9a-f]{64}$/);
        expect(record.codeHash).not.toContain(code);
    });

    it("answers an unknown email EXACTLY like a known one, sends nothing and stores nothing", async () => {
        const known = await accountWithCode();
        const unknown = uniqueEmail();

        const knownAnswer = await forgot(known.email);
        const unknownAnswer = await forgot(unknown);

        expect(unknownAnswer.status).toBe(knownAnswer.status);
        expect(unknownAnswer.body.message).toBe(knownAnswer.body.message);
        expect(Object.keys(unknownAnswer.body.data).sort()).toEqual(Object.keys(knownAnswer.body.data).sort());
        expect(unknownAnswer.body.data.email).toBe(unknown);
        expect(JSON.stringify(unknownAnswer.body)).not.toMatch(/\b\d{6}\b/);

        await nothingArrives();

        expect(emailsTo(unknown, "")).toHaveLength(0);
        expect(await PasswordReset.countDocuments({ email: unknown })).toBe(0);
    });

    it("answers the same 202 when asked again too soon, but sends no second email (the 60 second wait)", async () => {
        const { email } = await accountWithCode();

        const again = await forgot(email);
        expect(again.status).toBe(202);

        await nothingArrives();

        expect(emailsTo(email, "reset code")).toHaveLength(1);
    });

    it("sends a NEW code after the wait, and the old code stops working", async () => {
        const { email, code: oldCode } = await accountWithCode();

        await pastCooldown(email);
        await forgot(email);
        const newCode = await emailedCode(email, 2);

        expect(newCode).not.toBe(oldCode);

        const withOld = await reset(email, oldCode);
        expect(withOld.status).toBe(400);

        const withNew = await reset(email, newCode);
        expect(withNew.status).toBe(200);
    });

    it("sends at most 5 re-sends for one request, and stays silent after that", async () => {
        const { email } = await accountWithCode();

        for (let i = 2; i <= 6; i++) {
            await pastCooldown(email);
            await forgot(email);
            await emailedCode(email, i);
        }

        await pastCooldown(email);
        const seventh = await forgot(email);
        expect(seventh.status).toBe(202);

        await nothingArrives();

        expect(emailsTo(email, "reset code")).toHaveLength(6);
    });

    it("rejects a missing or invalid email with 400", async () => {
        expect((await request(app).post("/api/auth/password/forgot").send({})).status).toBe(400);
        expect((await forgot("not-an-email")).status).toBe(400);
    });
});

describe("POST /api/auth/password/reset: the right code", () => {
    beforeEach(() => clearOutbox());

    it("sets the new password: the old one stops working and the new one logs in", async () => {
        const { email, code } = await accountWithCode();

        const response = await reset(email, code);

        expect(response.status).toBe(200);
        expect(response.body.data).toBeNull();
        expect((await login(email, PASSWORD)).status).toBe(401);
        expect((await login(email, NEW_PASSWORD)).status).toBe(200);
    });

    it("does not log the person in (no cookie, no token)", async () => {
        const { email, code } = await accountWithCode();

        const response = await reset(email, code);

        expect(response.headers["set-cookie"]).toBeUndefined();
        expect(JSON.stringify(response.body)).not.toMatch(/accessToken/);
    });

    it("signs EVERY device out: old refresh cookies no longer renew", async () => {
        const { email, code, cookie } = await accountWithCode();

        const secondDevice = cookieOf(await login(email, PASSWORD));

        expect((await request(app).post("/api/auth/refresh").set("Cookie", secondDevice)).status).toBe(200);

        await reset(email, code);

        expect((await request(app).post("/api/auth/refresh").set("Cookie", cookie)).status).toBe(401);
        expect((await request(app).post("/api/auth/refresh").set("Cookie", secondDevice)).status).toBe(401);

        const user = await User.findOne({ email });
        expect(await RefreshSession.countDocuments({ userId: user._id, revokedAt: null })).toBe(0);
    });

    it("uses the code up: the record is gone and the same code cannot be used again", async () => {
        const { email, code } = await accountWithCode();

        await reset(email, code);

        expect(await PasswordReset.countDocuments({ email })).toBe(0);

        const again = await reset(email, code, "AnotherNew!pass999");
        expect(again.status).toBe(400);
        expect((await login(email, NEW_PASSWORD)).status).toBe(200);
    });

    it("creates a notification and emails the owner that the password was changed", async () => {
        const { email, code } = await accountWithCode();
        const user = await User.findOne({ email });

        await reset(email, code);

        expect(await Notification.findOne({ userId: user._id, title: "Password reset" })).not.toBeNull();

        await vi.waitFor(() => expect(emailsTo(email, "password was changed")).toHaveLength(1));
        expect(getLastEmailTo(email).text).not.toMatch(/\b\d{6}\b/);
    });

    it("marks an unverified email as verified (the code proved the person owns it)", async () => {
        const { email, code } = await accountWithCode();
        await User.updateOne({ email }, { $set: { emailVerified: false }, $unset: { emailVerifiedAt: "" } });

        await reset(email, code);

        const user = await User.findOne({ email });
        expect(user.emailVerified).toBe(true);
        expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    });

    it("lets only ONE of two simultaneous requests with the right code succeed", async () => {
        const { email, code } = await accountWithCode();

        const results = await Promise.all([reset(email, code, "FirstNew!pass111"), reset(email, code, "SecondNew!pass222")]);

        expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    });
});

describe("POST /api/auth/password/reset: every failure looks the same", () => {
    beforeEach(() => clearOutbox());

    it("a wrong code answers 400 OTP_INVALID with the one shared message, and the password is unchanged", async () => {
        const { email, code } = await accountWithCode();

        const response = await reset(email, wrongCodeFor(code));

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe("OTP_INVALID");
        expect(response.body.message).toBe(SAME_FAILURE);
        expect(response.body.details).toBeUndefined();
        expect((await login(email, PASSWORD)).status).toBe(200);
    });

    it("an unknown email gets exactly the same answer as a wrong code", async () => {
        const { email, code } = await accountWithCode();

        const wrong = await reset(email, wrongCodeFor(code));
        const unknown = await reset(uniqueEmail(), "123456");

        expect(unknown.status).toBe(wrong.status);
        expect(unknown.body).toEqual(wrong.body);
    });

    it("an expired code is refused with the same answer", async () => {
        const { email, code } = await accountWithCode();
        await PasswordReset.updateOne({ email }, { $set: { codeExpiresAt: new Date(Date.now() - 1000) } });

        const response = await reset(email, code);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(SAME_FAILURE);
    });

    it("5 wrong guesses kill the code: even the right one is then refused", async () => {
        const { email, code } = await accountWithCode();

        for (let i = 0; i < 5; i++) {
            expect((await reset(email, wrongCodeFor(code))).status).toBe(400);
        }

        const right = await reset(email, code);
        expect(right.status).toBe(400);
        expect(right.body.message).toBe(SAME_FAILURE);
        expect((await login(email, PASSWORD)).status).toBe(200);
    });

    it("a code that is not exactly 6 digits is refused by validation and does not use up a guess", async () => {
        const { email, code } = await accountWithCode();

        for (const bad of ["12345", "1234567", "abcdef", ""]) {
            const response = await reset(email, bad);
            expect(response.status).toBe(400);
            expect(response.body.errorCode).toBe("VALIDATION_ERROR");
        }

        expect((await PasswordReset.findOne({ email })).attempts).toBe(0);
        expect((await reset(email, code)).status).toBe(200);
    });

    it("a new password that is too short is refused by validation and does not use up a guess", async () => {
        const { email, code } = await accountWithCode();

        const response = await reset(email, code, "short");

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe("VALIDATION_ERROR");
        expect((await PasswordReset.findOne({ email })).attempts).toBe(0);
    });

    it("a sign-up code cannot be used to reset a password (different purpose)", async () => {
        const email = uniqueEmail();
        await request(app).post("/api/auth/register/start").send({ name: "Asha Rao", email, password: PASSWORD });
        const signUpCode = getLastEmailTo(email).text.match(/\b(\d{6})\b/)[1];

        const response = await reset(email, signUpCode);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(SAME_FAILURE);
    });
});

describe("when the email cannot be sent", () => {
    it("gives the cooldown back, so asking again works at once", async () => {
        const email = uniqueEmail();
        await signUpUser({ name: "Asha Rao", email, password: PASSWORD });
        clearOutbox();

        const spy = vi.spyOn(emailProvider, "sendEmail").mockRejectedValueOnce(new Error("provider down"));
        vi.spyOn(console, "error").mockImplementation(() => {});

        await forgot(email);
        await vi.waitFor(() => expect(spy).toHaveBeenCalled());
        await nothingArrives();
        vi.restoreAllMocks();

        const second = await forgot(email);
        expect(second.status).toBe(202);

        await emailedCode(email, 1);
    });
});

describe("deleting an account", () => {
    it("also removes its pending password reset", async () => {
        const { email } = await accountWithCode();
        const loggedIn = await login(email, PASSWORD);

        const deleted = await request(app)
            .delete("/api/users/me")
            .set("Authorization", `Bearer ${loggedIn.body.data.accessToken}`)
            .send({ password: PASSWORD });

        expect(deleted.status).toBe(200);
        expect(await PasswordReset.countDocuments({ email })).toBe(0);
    });
});
