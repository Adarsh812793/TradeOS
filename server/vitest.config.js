import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // The dev override: orders work at any hour. Tests of the closed market turn it off themselves.
        env: { MARKET_ALWAYS_OPEN: "true" },
        setupFiles: ["./test/setup.js"]
    }
});