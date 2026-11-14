import crypto from "crypto";

import config from "../../config/env.js";

// Everything about the 6-digit sign-up codes that does not touch the database: making one, hashing it for storage and
// checking a guess. Pure functions, so every rule is unit tested.

// The limits of the sign-up code flow, in one place so the service, the tests and the page agree
export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;          // how long one code stays valid
export const OTP_MAX_ATTEMPTS = 5;          // wrong guesses allowed per code before it is dead
export const RESEND_COOLDOWN_SECONDS = 60;  // the shortest wait between two emails
export const OTP_MAX_RESENDS = 5;           // emails that can be re-sent for one pending sign-up
export const PENDING_TTL_MINUTES = 30;      // an unfinished sign-up is forgotten after this long

// A random 6-digit code as TEXT, with leading zeros kept ("004217"). crypto.randomInt uses the operating system's
// cryptographic random source and picks every number equally likely; Math.random is predictable and must never be used
// for a secret.
export function generateOtp() {
    return String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

// A code is exactly OTP_LENGTH digits, nothing else (no spaces, letters or numbers-as-numbers)
function isWellFormed(code) {
    return typeof code === "string" && new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code);
}

// The value stored in the database instead of the code: HMAC-SHA256 with the server's secret, as 64 hex characters.
//   - It is a KEYED hash. A million possible codes means a plain hash could be reversed by trying them all in a blink;
//     without the secret (which is not in the database) an attacker cannot even check a guess.
//   - The email is mixed in, so the same code for two different sign-ups hashes differently and a hash copied from one
//     record is useless on another.
// `secret` can be passed for tests; the app always uses the one from the environment.
export function hashOtp(code, email, secret = config.OTP_SECRET) {
    return crypto
        .createHmac("sha256", secret)
        .update(`otp:v1:${String(email).trim().toLowerCase()}:${code}`)
        .digest("hex");
}

// True when `code` is the code that `storedHash` was made from. The comparison is CONSTANT TIME: an ordinary === stops
// at the first different character, so how long it takes could leak how much of a guess was right.
export function verifyOtp(code, email, storedHash, secret = config.OTP_SECRET) {
    if (!isWellFormed(code) || typeof storedHash !== "string") return false;

    const expected = Buffer.from(hashOtp(code, email, secret), "hex");
    const actual = Buffer.from(storedHash, "hex");

    // timingSafeEqual throws when the lengths differ (a damaged or foreign hash), which is simply "not equal"
    if (expected.length !== actual.length) return false;

    return crypto.timingSafeEqual(expected, actual);
}
