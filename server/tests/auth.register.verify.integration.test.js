import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import Notification from "../src/modules/notifications/notification.model.js";
import PendingRegistration from "../src/modules/auth/pendingRegistration.model.js";
import RefreshSession from "../src/modules/auth/refreshSession.model.js";
import User from "../src/modules/users/user.model.js";
import Wallet from "../src/modules/wallet/wallet.model.js";
import { clearOutbox, getLastEmailTo } from "../src/modules/email/memory.provider.js";
import { request, app } from "./helpers/tradeosTestUtils.js";

// Email sign-up step 3: confirming the code creates the account and logs the person in. The emails go to the in-memory
// provider, so the tests read the code out of the message.

const PASSWORD = "Sup3rSecret!pass";
const uniqueEmail = () => `otp-verify-${Date.now()}${Math.floor(Math.random() * 100000)}@example.com`;

const start = (email, name = "Asha Rao") => request(app).post("/api/auth/register/start").send({ name, email, password: PASSWORD });
const resend = (email) => request(app).post("/api/auth/register/resend").send({ email });
const verify = (email, code) => request(app).post("/api/auth/register/verify").send({ email, code });

const emailedCode = (email) => getLastEmailTo(email).text.match(/\b(\d{6})\b/)[1];
const wrongCodeFor = (code) => (code === "111111" ? "222222" : "111111");
const pastCooldown = (email) => PendingRegistration.updateOne({ email }, { $set: { lastSentAt: new Date(Date.now() - 61 * 1000) } });

// Starts a sign-up and returns the emailed code
async function signUp(email = uniqueEmail(), name) {
    const response = await start(email, name);
    expect(response.status).toBe(202);

    return { email, code: emailedCode(email) };
}

describe("POST /api/auth/register/verify: the right code", () => {
    beforeEach(() => clearOutbox());
    afterEach(() => vi.restoreAllMocks());

    it("creates the account, answers 201 with an access token and the user, and sets the refresh cookie", async () => {
        const { email, code } = await signUp(undefined, "Asha Rao");

        const response = await verify(email, code);

        expect(response.status).toBe(201);
        expect(response.body.data.accessToken).toEqual(expect.any(String));
        expect(response.body.data.user).toEqual({ id: expect.any(String), name: "Asha Rao", email });
        expect(JSON.stringify(response.body)).not.toContain("passwordHash");

        const cookie = response.headers["set-cookie"].find((value) => value.startsWith("refreshToken="));
        expect(cookie).toBeDefined();
        expect(cookie).toMatch(/HttpOnly/i);
    });

    it("saves the user as email-verified, with the password the person typed, plus a wallet of 1,00,000 and a welcome notification", async () => {
        const { email, code } = await signUp();

        const response = await verify(email, code);

        const user = await User.findOne({ email }).lean();
        expect(user.emailVerified).toBe(true);
        expect(user.emailVerifiedAt).toBeInstanceOf(Date);
        expect(user.passwordHash).toMatch(/^\$argon2/);

        const wallet = await Wallet.findOne({ userId: user._id }).lean();
        expect(wallet.balance).toBe(100000);

        const notifications = await Notification.find({ userId: user._id }).lean();
        expect(notifications).toHaveLength(1);
        expect(notifications[0].type).toBe("WELCOME");

        expect(String(user._id)).toBe(response.body.data.user.id);
    });

    it("deletes the pending sign-up (the code works once)", async () => {
        const { email, code } = await signUp();

        await verify(email, code);

        expect(await PendingRegistration.countDocuments({ email })).toBe(0);

        const again = await verify(email, code);
        expect(again.status).toBe(409);
        expect(again.body.errorCode).toBe("USER_ALREADY_EXISTS");
        expect(await User.countDocuments({ email })).toBe(1);
    });

    it("logs the person in for real: the token opens protected pages and the cookie renews it", async () => {
        const { email, code } = await signUp();

        const response = await verify(email, code);
        const token = response.body.data.accessToken;

        const me = await request(app).get("/api/users/me").set("Authorization", `Bearer ${token}`);
        expect(me.status).toBe(200);
        expect(me.body.data.email).toBe(email);

        const wallet = await request(app).get("/api/wallet").set("Authorization", `Bearer ${token}`);
        expect(wallet.body.data.balance).toBe(100000);

        const cookie = response.headers["set-cookie"].find((value) => value.startsWith("refreshToken="));
        const refreshed = await request(app).post("/api/auth/refresh").set("Cookie", cookie.split(";")[0]);
        expect(refreshed.status).toBe(200);
        expect(refreshed.body.data.accessToken).toEqual(expect.any(String));
    });

    it("lets the person log in with the password they typed at sign-up", async () => {
        const { email, code } = await signUp();
        await verify(email, code);

        const login = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });

        expect(login.status).toBe(200);
    });

    it("accepts the email in any letter case and with spaces around it", async () => {
        const { email, code } = await signUp();

        const response = await verify(`  ${email.toUpperCase()}  `, `  ${code} `);

        expect(response.status).toBe(201);
    });

    it("needs the sign-up to exist: a code sent to nobody is 404, not a guess against someone else", async () => {
        const response = await verify(uniqueEmail(), "123456");

        expect(response.status).toBe(404);
        expect(response.body.errorCode).toBe("NO_PENDING_REGISTRATION");
    });
});

describe("POST /api/auth/register/verify: wrong codes and attempts", () => {
    beforeEach(() => clearOutbox());
    afterEach(() => vi.restoreAllMocks());

    it("says how many attempts are left, and creates nothing", async () => {
        const { email, code } = await signUp();

        const response = await verify(email, wrongCodeFor(code));

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe("OTP_INVALID");
        expect(response.body.details.attemptsLeft).toBe(4);
        expect(await User.countDocuments({ email })).toBe(0);
        expect((await PendingRegistration.findOne({ email }).lean()).attempts).toBe(1);
    });

    it("kills the code after 5 wrong guesses: even the RIGHT code is refused with 429", async () => {
        const { email, code } = await signUp();
        const wrong = wrongCodeFor(code);

        const left = [];
        for (let i = 0; i < 5; i++) {
            const response = await verify(email, wrong);
            expect(response.body.errorCode).toBe("OTP_INVALID");
            left.push(response.body.details.attemptsLeft);
        }
        expect(left).toEqual([4, 3, 2, 1, 0]);

        const rightButTooLate = await verify(email, code);

        expect(rightButTooLate.status).toBe(429);
        expect(rightButTooLate.body.errorCode).toBe("OTP_ATTEMPTS_EXCEEDED");
        expect(await User.countDocuments({ email })).toBe(0);
    });

    it("gives a fresh start with a new code: the new code works, the dead one does not", async () => {
        const { email, code: oldCode } = await signUp();
        for (let i = 0; i < 5; i++) await verify(email, wrongCodeFor(oldCode));

        await pastCooldown(email);
        expect((await resend(email)).status).toBe(200);
        const newCode = emailedCode(email);

        expect((await verify(email, oldCode)).status).toBe(400);   // the old code is gone
        const response = await verify(email, newCode);

        expect(response.status).toBe(201);
    });

    it("lets simultaneous guesses try only 5 codes in total, however many are sent at once", async () => {
        const { email, code } = await signUp();
        const wrong = wrongCodeFor(code);

        const responses = await Promise.all(Array.from({ length: 12 }, () => verify(email, wrong)));

        const tried = responses.filter((response) => response.body.errorCode === "OTP_INVALID");
        const refused = responses.filter((response) => response.body.errorCode === "OTP_ATTEMPTS_EXCEEDED");

        expect(tried).toHaveLength(5);
        expect(refused).toHaveLength(7);
        expect(tried.map((response) => response.body.details.attemptsLeft).sort()).toEqual([0, 1, 2, 3, 4]);
        expect((await PendingRegistration.findOne({ email }).lean()).attempts).toBe(5);
    });

    it("a code that is not exactly 6 digits is refused with 400 and does not use up an attempt", async () => {
        const { email } = await signUp();

        for (const bad of ["12345", "1234567", "12345a", "", "      ", undefined, 123456]) {
            const response = await request(app).post("/api/auth/register/verify").send({ email, code: bad });

            expect(response.status).toBe(400);
            expect(response.body.errorCode).toBe("VALIDATION_ERROR");
        }

        expect((await PendingRegistration.findOne({ email }).lean()).attempts).toBe(0);
    });
});

describe("POST /api/auth/register/verify: expired and replaced codes", () => {
    beforeEach(() => clearOutbox());
    afterEach(() => vi.restoreAllMocks());

    it("refuses a code that has expired (400) without using an attempt, and a new code fixes it", async () => {
        const { email, code } = await signUp();
        await PendingRegistration.updateOne({ email }, { $set: { codeExpiresAt: new Date(Date.now() - 1000) } });

        const response = await verify(email, code);

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe("OTP_EXPIRED");
        expect((await PendingRegistration.findOne({ email }).lean()).attempts).toBe(0);

        await pastCooldown(email);
        await resend(email);
        expect((await verify(email, emailedCode(email))).status).toBe(201);
    });

    it("treats a sign-up that has died (but MongoDB has not removed yet) as not there", async () => {
        const { email, code } = await signUp();
        await PendingRegistration.updateOne({ email }, { $set: { expiresAt: new Date(Date.now() - 1000) } });

        const response = await verify(email, code);

        expect(response.status).toBe(404);
        expect(response.body.errorCode).toBe("NO_PENDING_REGISTRATION");
    });

    it("a re-sent code replaces the old one: the old code fails, the new one works", async () => {
        const { email, code: codeA } = await signUp();
        await pastCooldown(email);
        await resend(email);
        const codeB = emailedCode(email);
        expect(codeB).not.toBe(codeA);

        const old = await verify(email, codeA);
        expect(old.status).toBe(400);
        expect(old.body.errorCode).toBe("OTP_INVALID");

        expect((await verify(email, codeB)).status).toBe(201);
    });
});

describe("POST /api/auth/register/verify: one account, all or nothing", () => {
    beforeEach(() => clearOutbox());
    afterEach(() => vi.restoreAllMocks());

    it("two requests with the right code at the same moment make exactly one account", async () => {
        const { email, code } = await signUp();

        const [a, b] = await Promise.all([verify(email, code), verify(email, code)]);

        expect([a.status, b.status].sort()).toEqual([201, 409]);

        const user = await User.findOne({ email }).lean();
        expect(await User.countDocuments({ email })).toBe(1);
        expect(await Wallet.countDocuments({ userId: user._id })).toBe(1);
        expect(await Notification.countDocuments({ userId: user._id })).toBe(1);
        expect(await RefreshSession.countDocuments({ userId: user._id })).toBe(1); // only the winner is logged in
    });

    it("an account made another way in the meantime wins: 409, and no second user", async () => {
        const { email, code } = await signUp();
        // The old direct sign-up route (still present in this commit) takes the email first
        const direct = await request(app).post("/api/auth/register").send({ name: "Direct", email, password: PASSWORD });
        expect(direct.status).toBe(201);

        const response = await verify(email, code);

        expect(response.status).toBe(409);
        expect(response.body.errorCode).toBe("USER_ALREADY_EXISTS");
        expect(await User.countDocuments({ email })).toBe(1);
    });

    it("if creating the wallet fails, NOTHING is created and the sign-up is kept, so the person can try again", async () => {
        const { email, code } = await signUp();
        vi.spyOn(Wallet, "create").mockRejectedValueOnce(new Error("simulated database failure"));
        vi.spyOn(console, "error").mockImplementation(() => {});

        const failed = await verify(email, code);

        expect(failed.status).toBe(500);
        expect(await User.countDocuments({ email })).toBe(0);                // no half-made account
        expect(await PendingRegistration.countDocuments({ email })).toBe(1); // the sign-up survives

        const retry = await verify(email, code);
        expect(retry.status).toBe(201);
        expect(await User.countDocuments({ email })).toBe(1);
    });
});
