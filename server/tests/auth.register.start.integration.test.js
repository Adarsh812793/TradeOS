import argon2 from "argon2";
import express from "express";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import PendingRegistration from "../src/modules/auth/pendingRegistration.model.js";
import User from "../src/modules/users/user.model.js";
import Wallet from "../src/modules/wallet/wallet.model.js";
import AppError from "../src/utils/AppError.js";
import { SIGNUP_RATE_LIMIT, createIpRateLimiter } from "../src/middleware/rateLimit.middleware.js";
import { getEmailProvider } from "../src/modules/email/email.provider.js";
import { clearOutbox, getLastEmailTo, getOutbox } from "../src/modules/email/memory.provider.js";
import { OTP_MAX_RESENDS, verifyOtp } from "../src/modules/auth/otp.utils.js";
import { request, app, createAuthenticatedUser } from "./helpers/tradeosTestUtils.js";

// Email sign-up steps 1 and 2: starting a sign-up and re-sending its code. The emails go to the in-memory provider, so
// nothing is really sent and the tests read the code out of the message.

const PASSWORD = "Sup3rSecret!pass";
const uniqueEmail = () => `otp-start-${Date.now()}${Math.floor(Math.random() * 100000)}@example.com`;

const start = (body) => request(app).post("/api/auth/register/start").send(body);
const resend = (body) => request(app).post("/api/auth/register/resend").send(body);
const newSignup = (email = uniqueEmail(), overrides = {}) => ({ name: "Asha Rao", email, password: PASSWORD, ...overrides });

// The 6-digit code in the newest email sent to an address
const emailedCode = (email) => getLastEmailTo(email).text.match(/\b(\d{6})\b/)[1];

// Pretends the 60 second cooldown has passed
const pastCooldown = (email) =>
    PendingRegistration.updateOne({ email }, { $set: { lastSentAt: new Date(Date.now() - 61 * 1000) } });

describe("POST /api/auth/register/start", () => {
    beforeEach(() => clearOutbox());
    afterEach(() => vi.restoreAllMocks());

    it("answers 202 with the facts the page needs and never the code", async () => {
        const body = newSignup();

        const response = await start(body);

        expect(response.status).toBe(202);
        expect(response.body.data).toEqual({ email: body.email, resendAvailableInSeconds: 60, codeExpiresInMinutes: 10 });
        expect(JSON.stringify(response.body)).not.toContain(emailedCode(body.email));
        expect(JSON.stringify(response.body)).not.toContain(PASSWORD);
    });

    it("creates NO user and NO wallet, and the person cannot log in yet", async () => {
        const body = newSignup();

        await start(body);

        expect(await User.findOne({ email: body.email })).toBeNull();
        const login = await request(app).post("/api/auth/login").send({ email: body.email, password: PASSWORD });
        expect(login.status).toBe(401);
        expect(await Wallet.countDocuments({ userId: null })).toBe(0);
    });

    it("emails the code to the address, with the name, the lifetime and a subject without the code", async () => {
        const body = newSignup();

        await start(body);

        const email = getLastEmailTo(body.email);
        expect(getOutbox()).toHaveLength(1);
        expect(email.subject).toBe("Your TradeOS verification code");
        expect(email.subject).not.toContain(emailedCode(body.email));
        expect(email.text).toContain("Hi Asha Rao");
        expect(email.text).toContain("10 minutes");
        expect(emailedCode(body.email)).toMatch(/^\d{6}$/);
    });

    it("stores a pending sign-up with only hashes: the code and the password are nowhere in the database", async () => {
        const body = newSignup();

        await start(body);

        const pending = await PendingRegistration.findOne({ email: body.email }).lean();
        const code = emailedCode(body.email);

        expect(pending.passwordHash).toMatch(/^\$argon2/);
        expect(await argon2.verify(pending.passwordHash, PASSWORD)).toBe(true);
        expect(pending.codeHash).toMatch(/^[0-9a-f]{64}$/);
        expect(verifyOtp(code, body.email, pending.codeHash)).toBe(true);
        expect(JSON.stringify(pending)).not.toContain(PASSWORD);
        expect(JSON.stringify(pending)).not.toContain(code);

        expect(pending).toMatchObject({ name: "Asha Rao", attempts: 0, resendCount: 0 });
        expect(pending.codeExpiresAt.getTime() - Date.now()).toBeGreaterThan(9 * 60 * 1000);
        expect(pending.codeExpiresAt.getTime() - Date.now()).toBeLessThanOrEqual(10 * 60 * 1000);
        expect(pending.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 60 * 1000);
    });

    it("trims and lower-cases the email", async () => {
        const email = uniqueEmail();

        const response = await start(newSignup(`  ${email.toUpperCase()}  `));

        expect(response.status).toBe(202);
        expect(await PendingRegistration.countDocuments({ email })).toBe(1);
        expect(getLastEmailTo(email)).toBeDefined();
    });

    it("rejects a bad name, email or password with 400 and stores and sends nothing", async () => {
        const email = uniqueEmail();

        for (const bad of [
            newSignup(email, { name: "A" }),
            newSignup(email, { email: "not-an-email" }),
            newSignup(email, { password: "short" }),
            { email, password: PASSWORD },
            {}
        ]) {
            const response = await start(bad);

            expect(response.status).toBe(400);
            expect(response.body.errorCode).toBe("VALIDATION_ERROR");
        }

        expect(await PendingRegistration.countDocuments({ email })).toBe(0);
        expect(getOutbox()).toHaveLength(0);
    });

    it("refuses an email that already has an account with 409, and sends and stores nothing", async () => {
        const existing = await createAuthenticatedUser();
        clearOutbox(); // creating that user sent its own verification email; only what happens next is being checked

        const response = await start(newSignup(existing.email));

        expect(response.status).toBe(409);
        expect(response.body.errorCode).toBe("USER_ALREADY_EXISTS");
        expect(await PendingRegistration.countDocuments({ email: existing.email })).toBe(0);
        expect(getOutbox()).toHaveLength(0);
    });

    it("makes the person wait: starting again at once gives 429 with the seconds left and sends nothing", async () => {
        const body = newSignup();
        await start(body);
        const before = await PendingRegistration.findOne({ email: body.email }).lean();

        const again = await start(body);

        expect(again.status).toBe(429);
        expect(again.body.errorCode).toBe("OTP_RESEND_TOO_SOON");
        expect(again.body.details.retryAfterSeconds).toBeGreaterThanOrEqual(1);
        expect(again.body.details.retryAfterSeconds).toBeLessThanOrEqual(60);
        expect(getOutbox()).toHaveLength(1);

        const after = await PendingRegistration.findOne({ email: body.email }).lean();
        expect(after.codeHash).toBe(before.codeHash);
        expect(after.resendCount).toBe(0);
    });

    it("starting again after the wait replaces the details and the code, and the old code dies", async () => {
        const email = uniqueEmail();
        await start(newSignup(email, { name: "First Name" }));
        const oldCode = emailedCode(email);
        await PendingRegistration.updateOne({ email }, { $set: { attempts: 3 } });
        await pastCooldown(email);

        const second = await start(newSignup(email, { name: "Second Name", password: "An0therPassword!" }));

        expect(second.status).toBe(202);
        expect(getOutbox()).toHaveLength(2);
        expect(await PendingRegistration.countDocuments({ email })).toBe(1);

        const pending = await PendingRegistration.findOne({ email }).lean();
        const newCode = emailedCode(email);

        expect(newCode).not.toBe(oldCode);
        expect(verifyOtp(newCode, email, pending.codeHash)).toBe(true);
        expect(verifyOtp(oldCode, email, pending.codeHash)).toBe(false);
        expect(pending.name).toBe("Second Name");
        expect(await argon2.verify(pending.passwordHash, "An0therPassword!")).toBe(true);
        expect(pending.attempts).toBe(0);      // the new code starts with every guess unused
        expect(pending.resendCount).toBe(1);   // but the resend budget carries over: starting over is not free
    });

    it("counts restarts and re-sends together: after 5 the next one is refused with OTP_RESEND_LIMIT", async () => {
        const email = uniqueEmail();
        await start(newSignup(email));

        for (let i = 1; i <= OTP_MAX_RESENDS; i++) {
            await pastCooldown(email);
            const response = i % 2 ? await start(newSignup(email)) : await resend({ email });
            expect(response.status).toBeLessThan(300);
        }

        await pastCooldown(email);

        const refusedStart = await start(newSignup(email));
        const refusedResend = await resend({ email });

        for (const refused of [refusedStart, refusedResend]) {
            expect(refused.status).toBe(429);
            expect(refused.body.errorCode).toBe("OTP_RESEND_LIMIT");
        }

        expect(getOutbox()).toHaveLength(1 + OTP_MAX_RESENDS);
    });

    it("begins a fresh sign-up, with fresh counters, when the old one is dead but MongoDB has not removed it yet", async () => {
        const email = uniqueEmail();
        await start(newSignup(email));
        await PendingRegistration.updateOne({ email }, { $set: { expiresAt: new Date(Date.now() - 1000), resendCount: 4 } });

        const response = await start(newSignup(email));

        expect(response.status).toBe(202);
        const pending = await PendingRegistration.findOne({ email }).lean();
        expect(pending.resendCount).toBe(0);
        expect(pending.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("when the email cannot be sent: answers 503, keeps the sign-up and gives the cooldown back", async () => {
        const email = uniqueEmail();
        const send = vi.spyOn(getEmailProvider(), "send");
        send.mockRejectedValueOnce(new AppError("We couldn't send the email right now. Please try again in a moment.", 503, "EMAIL_SEND_FAILED"));

        const failed = await start(newSignup(email));

        expect(failed.status).toBe(503);
        expect(failed.body.errorCode).toBe("EMAIL_SEND_FAILED");
        expect(await PendingRegistration.countDocuments({ email })).toBe(1);

        // Nothing arrived, so the person is not made to wait: pressing Resend works straight away
        const retry = await resend({ email });
        expect(retry.status).toBe(200);
        expect(getOutbox()).toHaveLength(1);
        expect(verifyOtp(emailedCode(email), email, (await PendingRegistration.findOne({ email }).lean()).codeHash)).toBe(true);
    });

    it("when a restart's email cannot be sent, the earlier cooldown and resend count are restored", async () => {
        const email = uniqueEmail();
        await start(newSignup(email));
        await pastCooldown(email);
        await PendingRegistration.updateOne({ email }, { $set: { resendCount: 2 } });
        const before = await PendingRegistration.findOne({ email }).lean();

        vi.spyOn(getEmailProvider(), "send").mockRejectedValueOnce(new AppError("down", 503, "EMAIL_SEND_FAILED"));

        const failed = await start(newSignup(email));

        expect(failed.status).toBe(503);
        const after = await PendingRegistration.findOne({ email }).lean();
        expect(after.resendCount).toBe(2);
        expect(after.lastSentAt.getTime()).toBe(before.lastSentAt.getTime());
    });

    it("two starts for a brand new email at the same moment send exactly one email", async () => {
        const email = uniqueEmail();

        const [a, b] = await Promise.all([start(newSignup(email)), start(newSignup(email))]);

        expect([a.status, b.status].sort()).toEqual([202, 429]);
        expect(getOutbox().filter((message) => message.to === email)).toHaveLength(1);
        expect(await PendingRegistration.countDocuments({ email })).toBe(1);
    });
});

describe("POST /api/auth/register/resend", () => {
    beforeEach(() => clearOutbox());
    afterEach(() => vi.restoreAllMocks());

    it("says there is no sign-up in progress when nothing is pending (404), and sends nothing", async () => {
        const response = await resend({ email: uniqueEmail() });

        expect(response.status).toBe(404);
        expect(response.body.errorCode).toBe("NO_PENDING_REGISTRATION");
        expect(getOutbox()).toHaveLength(0);
    });

    it("treats a dead sign-up that MongoDB has not removed yet as not there", async () => {
        const email = uniqueEmail();
        await start(newSignup(email));
        await PendingRegistration.updateOne({ email }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
        await pastCooldown(email);

        const response = await resend({ email });

        expect(response.status).toBe(404);
        expect(response.body.errorCode).toBe("NO_PENDING_REGISTRATION");
    });

    it("sends a new code to the same person: the old code dies, the guesses start again, the count goes up", async () => {
        const email = uniqueEmail();
        await start(newSignup(email, { name: "Priya Nair" }));
        const oldCode = emailedCode(email);
        await PendingRegistration.updateOne({ email }, { $set: { attempts: 4 } });
        await pastCooldown(email);

        const response = await resend({ email });

        expect(response.status).toBe(200);
        expect(response.body.data).toEqual({ email, resendAvailableInSeconds: 60, codeExpiresInMinutes: 10 });
        expect(getOutbox()).toHaveLength(2);
        expect(getLastEmailTo(email).text).toContain("Hi Priya Nair");

        const pending = await PendingRegistration.findOne({ email }).lean();
        const newCode = emailedCode(email);
        expect(newCode).not.toBe(oldCode);
        expect(verifyOtp(newCode, email, pending.codeHash)).toBe(true);
        expect(verifyOtp(oldCode, email, pending.codeHash)).toBe(false);
        expect(pending.attempts).toBe(0);
        expect(pending.resendCount).toBe(1);
    });

    it("accepts the email in any letter case", async () => {
        const email = uniqueEmail();
        await start(newSignup(email));
        await pastCooldown(email);

        const response = await resend({ email: `  ${email.toUpperCase()} ` });

        expect(response.status).toBe(200);
    });

    it("makes the person wait 60 seconds between emails", async () => {
        const email = uniqueEmail();
        await start(newSignup(email));

        const response = await resend({ email });

        expect(response.status).toBe(429);
        expect(response.body.errorCode).toBe("OTP_RESEND_TOO_SOON");
        expect(response.body.details.retryAfterSeconds).toBeGreaterThanOrEqual(1);
        expect(getOutbox()).toHaveLength(1);
    });

    it("rejects a missing or malformed email with 400", async () => {
        for (const bad of [{}, { email: "nope" }, { email: "" }]) {
            const response = await resend(bad);

            expect(response.status).toBe(400);
            expect(response.body.errorCode).toBe("VALIDATION_ERROR");
        }
    });

    it("two re-sends at the same moment send exactly one email", async () => {
        const email = uniqueEmail();
        await start(newSignup(email));
        await pastCooldown(email);
        clearOutbox();

        const [a, b] = await Promise.all([resend({ email }), resend({ email })]);

        expect([a.status, b.status].sort()).toEqual([200, 429]);
        expect(getOutbox()).toHaveLength(1);
        expect((await PendingRegistration.findOne({ email }).lean()).resendCount).toBe(1);
    });

    it("never lets the sign-up be deleted before its own code runs out", async () => {
        const email = uniqueEmail();
        await start(newSignup(email));
        await PendingRegistration.updateOne({ email }, { $set: { expiresAt: new Date(Date.now() + 30 * 1000) } });
        await pastCooldown(email);

        await resend({ email });

        const pending = await PendingRegistration.findOne({ email }).lean();
        expect(pending.expiresAt.getTime()).toBeGreaterThan(pending.codeExpiresAt.getTime());
    });

    it("when the email cannot be sent: answers 503 and gives the cooldown and the count back", async () => {
        const email = uniqueEmail();
        await start(newSignup(email));
        await pastCooldown(email);
        const before = await PendingRegistration.findOne({ email }).lean();

        vi.spyOn(getEmailProvider(), "send").mockRejectedValueOnce(new AppError("down", 503, "EMAIL_SEND_FAILED"));

        const failed = await resend({ email });

        expect(failed.status).toBe(503);
        const after = await PendingRegistration.findOne({ email }).lean();
        expect(after.resendCount).toBe(before.resendCount);
        expect(after.lastSentAt.getTime()).toBe(before.lastSentAt.getTime());

        // ... so the next try goes straight through
        expect((await resend({ email })).status).toBe(200);
    });
});

describe("the sign-up rate limiter", () => {
    it("allows 20 requests per IP in 15 minutes, on its own counter apart from login", async () => {
        expect(SIGNUP_RATE_LIMIT).toBe(20);

        const mini = express();
        mini.post("/limited", createIpRateLimiter({ limit: SIGNUP_RATE_LIMIT, message: "Too many sign-up attempts.", skip: () => false }), (req, res) =>
            res.status(200).json({ success: true })
        );

        for (let i = 0; i < SIGNUP_RATE_LIMIT; i++) {
            expect((await request(mini).post("/limited")).status).toBe(200);
        }

        expect((await request(mini).post("/limited")).status).toBe(429);
    });
});
