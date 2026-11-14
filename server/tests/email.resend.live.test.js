import { describe, it, expect } from "vitest";

import { createResendProvider } from "../src/modules/email/resend.provider.js";
import { otpEmail } from "../src/modules/email/email.templates.js";

// A REAL email through Resend. It is skipped unless BOTH values are in the environment of that one run (neither is in
// .env.test, so a normal test run never sends anything):
//   RESEND_LIVE_API_KEY  your Resend API key
//   RESEND_LIVE_TO       the address to send to: it must be the address your Resend account was created with,
//                        because without a verified domain Resend only delivers to that address
// It sends exactly one email, from Resend's shared test sender.
//   Example (one run, nothing is saved to any file):
//   RESEND_LIVE_API_KEY=re_... RESEND_LIVE_TO=you@example.com npx vitest run tests/email.resend.live.test.js
const apiKey = process.env.RESEND_LIVE_API_KEY;
const recipient = process.env.RESEND_LIVE_TO;

describe.skipIf(!apiKey || !recipient)("Email: one real message through Resend", () => {
    it("sends the sign-up code email and gets a message id back", async () => {
        const provider = createResendProvider({ apiKey, from: "TradeOS <onboarding@resend.dev>" });
        const message = otpEmail({ name: "Test", code: "123456", minutes: 10 });

        const result = await provider.send({ to: recipient, ...message });

        expect(result.id).toEqual(expect.any(String));
    });
});
