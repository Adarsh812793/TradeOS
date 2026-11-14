import crypto from "crypto";
import { describe, it, expect, vi, afterEach } from "vitest";

import { resolveOtpSecret } from "../src/config/otpConfig.js";
import {
    OTP_LENGTH,
    OTP_MAX_ATTEMPTS,
    OTP_MAX_RESENDS,
    OTP_TTL_MINUTES,
    PENDING_TTL_MINUTES,
    RESEND_COOLDOWN_SECONDS,
    generateOtp,
    hashOtp,
    verifyOtp
} from "../src/modules/auth/otp.utils.js";

// Unit tests of the sign-up code helpers (no database).

const SECRET = "unit-test-secret-0123456789abcdef0123456789abcdef";

describe("generateOtp", () => {
    afterEach(() => vi.restoreAllMocks());

    it("always gives exactly 6 digits as text", () => {
        for (let i = 0; i < 2000; i++) {
            expect(generateOtp()).toMatch(/^\d{6}$/);
        }
    });

    it("keeps leading zeros, so a low number is still 6 characters", () => {
        const randomInt = vi.spyOn(crypto, "randomInt");

        randomInt.mockReturnValueOnce(0);
        expect(generateOtp()).toBe("000000");

        randomInt.mockReturnValueOnce(42);
        expect(generateOtp()).toBe("000042");

        randomInt.mockReturnValueOnce(999999);
        expect(generateOtp()).toBe("999999");
    });

    it("draws from the whole range 0 to 999999 with the cryptographic random generator", () => {
        const randomInt = vi.spyOn(crypto, "randomInt");

        generateOtp();

        expect(randomInt).toHaveBeenCalledWith(0, 1_000_000);
    });

    it("does not repeat itself or favour a leading digit", () => {
        const codes = Array.from({ length: 3000 }, generateOtp);
        const firstDigits = new Set(codes.map((code) => code[0]));

        expect(new Set(codes).size).toBeGreaterThan(2900); // a million possibilities: repeats are rare
        expect(firstDigits.size).toBe(10);                 // every digit shows up at the front
    });
});

describe("hashOtp", () => {
    it("gives 64 hex characters that do not contain the code", () => {
        const hash = hashOtp("482913", "asha@example.com", SECRET);

        expect(hash).toMatch(/^[0-9a-f]{64}$/);
        expect(hash).not.toContain("482913");
    });

    it("is the same every time for the same code, email and secret", () => {
        expect(hashOtp("482913", "asha@example.com", SECRET)).toBe(hashOtp("482913", "asha@example.com", SECRET));
    });

    it("changes with the code, with the email and with the secret", () => {
        const base = hashOtp("482913", "asha@example.com", SECRET);

        expect(hashOtp("482914", "asha@example.com", SECRET)).not.toBe(base);
        expect(hashOtp("482913", "other@example.com", SECRET)).not.toBe(base);
        expect(hashOtp("482913", "asha@example.com", `${SECRET}x`)).not.toBe(base);
    });

    it("treats the email the way the database does (trimmed, any letter case)", () => {
        expect(hashOtp("482913", "  Asha@Example.COM ", SECRET)).toBe(hashOtp("482913", "asha@example.com", SECRET));
    });
});

describe("verifyOtp", () => {
    afterEach(() => vi.restoreAllMocks());

    const hash = hashOtp("482913", "asha@example.com", SECRET);

    it("accepts the right code", () => {
        expect(verifyOtp("482913", "asha@example.com", hash, SECRET)).toBe(true);
    });

    it("rejects a wrong code, even one digit off", () => {
        expect(verifyOtp("482914", "asha@example.com", hash, SECRET)).toBe(false);
        expect(verifyOtp("000000", "asha@example.com", hash, SECRET)).toBe(false);
    });

    it("rejects the right code for a different email (a hash cannot be moved to another sign-up)", () => {
        expect(verifyOtp("482913", "eve@example.com", hash, SECRET)).toBe(false);
    });

    it("rejects the right code under a different secret", () => {
        expect(verifyOtp("482913", "asha@example.com", hash, `${SECRET}x`)).toBe(false);
    });

    it("rejects anything that is not exactly 6 digits of text, without even hashing it", () => {
        const hmac = vi.spyOn(crypto, "createHmac");

        for (const bad of ["48291", "4829133", " 482913", "482913 ", "48a913", "", "４８２９１３", 482913, null, undefined, {}, ["482913"]]) {
            expect(verifyOtp(bad, "asha@example.com", hash, SECRET)).toBe(false);
        }

        expect(hmac).not.toHaveBeenCalled();
    });

    it("rejects a missing, damaged or foreign stored hash instead of throwing", () => {
        expect(verifyOtp("482913", "asha@example.com", undefined, SECRET)).toBe(false);
        expect(verifyOtp("482913", "asha@example.com", "", SECRET)).toBe(false);
        expect(verifyOtp("482913", "asha@example.com", "abcd", SECRET)).toBe(false);
        expect(verifyOtp("482913", "asha@example.com", hash.slice(0, -2), SECRET)).toBe(false);
        expect(verifyOtp("482913", "asha@example.com", `${hash}00`, SECRET)).toBe(false);
    });

    it("compares in constant time (timingSafeEqual), not with ===", () => {
        const compare = vi.spyOn(crypto, "timingSafeEqual");

        verifyOtp("482913", "asha@example.com", hash, SECRET);

        expect(compare).toHaveBeenCalledTimes(1);
    });
});

describe("the limits of the sign-up code flow", () => {
    it("are the agreed ones", () => {
        expect(OTP_LENGTH).toBe(6);
        expect(OTP_TTL_MINUTES).toBe(10);
        expect(OTP_MAX_ATTEMPTS).toBe(5);
        expect(RESEND_COOLDOWN_SECONDS).toBe(60);
        expect(OTP_MAX_RESENDS).toBe(5);
        expect(PENDING_TTL_MINUTES).toBe(30);
    });

    it("keep the guessing chance tiny: 5 tries against 1,000,000 possible codes", () => {
        expect(OTP_MAX_ATTEMPTS / 10 ** OTP_LENGTH).toBeLessThan(0.00001);
    });

    it("let a sign-up outlive its code, so there is time to ask for a new one", () => {
        expect(PENDING_TTL_MINUTES).toBeGreaterThan(OTP_TTL_MINUTES);
    });
});

describe("the OTP secret's startup rules", () => {
    const jwtSecret = "a-completely-different-jwt-secret-0123456789abcdef";

    it("accepts a long secret that differs from the JWT secret", () => {
        expect(resolveOtpSecret({ secret: SECRET, jwtSecret })).toBe(SECRET);
    });

    it("refuses a missing secret", () => {
        expect(() => resolveOtpSecret({ secret: undefined, jwtSecret })).toThrow(/OTP_SECRET/);
        expect(() => resolveOtpSecret({ secret: "", jwtSecret })).toThrow(/OTP_SECRET/);
    });

    it("refuses a short secret (under 32 characters)", () => {
        expect(() => resolveOtpSecret({ secret: "short", jwtSecret })).toThrow(/at least 32/);
        expect(() => resolveOtpSecret({ secret: "x".repeat(31), jwtSecret })).toThrow(/at least 32/);
        expect(resolveOtpSecret({ secret: "x".repeat(32), jwtSecret })).toBe("x".repeat(32));
    });

    it("refuses to reuse the JWT secret", () => {
        expect(() => resolveOtpSecret({ secret: jwtSecret, jwtSecret })).toThrow(/different from JWT_ACCESS_SECRET/);
    });
});
