import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // The dev override: orders work at any hour. Tests of the closed market turn it off themselves.
        // Emails are kept in memory (never sent), so tests can read the sign-up code from them
        env: { MARKET_ALWAYS_OPEN: "true", EMAIL_PROVIDER: "memory" },
        // The tests talk to a remote database and many files run at once, so 5 s (the default) is too tight
        testTimeout: 20000,
        setupFiles: ["./test/setup.js"]
    }
});