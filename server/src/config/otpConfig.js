// Checks the secret that protects the sign-up codes. A pure function (no process.env inside) so every rule can be unit
// tested; config/env.js calls it once at startup and the server refuses to start if the secret is unsafe.
//
// WHY A SECRET AT ALL: a sign-up code has only 1,000,000 possibilities. If the database stored a plain hash of it, anyone
// who got a copy of the database could try all million codes in a fraction of a second. The codes are hashed with
// HMAC and this secret, which lives only in the server's environment, so a stolen database alone is not enough.
const MIN_LENGTH = 32;

export function resolveOtpSecret({ secret, jwtSecret }) {
    if (!secret) {
        throw new Error("Missing required environment variable: OTP_SECRET (a long random string, for example from: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\").");
    }

    if (secret.length < MIN_LENGTH) {
        throw new Error(`OTP_SECRET must be at least ${MIN_LENGTH} characters long (it is ${secret.length}).`);
    }

    // One leaked secret must not open two doors: the login tokens and the sign-up codes use different secrets
    if (secret === jwtSecret) {
        throw new Error("OTP_SECRET must be different from JWT_ACCESS_SECRET.");
    }

    return secret;
}
