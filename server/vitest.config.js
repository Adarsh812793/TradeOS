import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // The dev override: orders work at any hour. Tests of the closed market turn it off themselves.
        // Emails are kept in memory (never sent), so tests can read the sign-up code from them
        env: {
            MARKET_ALWAYS_OPEN: "true",
            EMAIL_PROVIDER: "memory",
            // A fixed test-only secret for the sign-up codes (never used outside the tests)
            OTP_SECRET: "test-only-otp-secret-0123456789abcdef0123456789abcdef"
        },
        // The tests talk to a remote database and many files run at once, so 5 s (the default) is too tight
        testTimeout: 20000,
        // The same allowance for the setup hooks (beforeEach / beforeAll): they do the same remote-database work (sign a user
        // up through the emailed code, place orders ...) and their default of 10 s was crossed now and then under load
        hookTimeout: 20000,
        setupFiles: ["./test/setup.js"]
    }
});