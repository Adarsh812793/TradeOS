import { describe, it, expect, beforeEach, vi } from "vitest";

import { resolveEmailConfig } from "../src/config/emailConfig.js";
import { sendEmail, getEmailProvider } from "../src/modules/email/email.provider.js";
import { createConsoleProvider } from "../src/modules/email/console.provider.js";
import { clearOutbox, getLastEmailTo, getOutbox } from "../src/modules/email/memory.provider.js";
import { escapeHtml, otpEmail } from "../src/modules/email/email.templates.js";

// Unit tests of the email module: no real email is ever sent (the tests run with EMAIL_PROVIDER=memory).

describe("which email provider the server may use", () => {
    const resend = { provider: "resend", resendApiKey: "re_test_key", from: "TradeOS <onboarding@resend.dev>" };

    it("lets development and test default to the console when nothing is set", () => {
        expect(resolveEmailConfig({ nodeEnv: "development" }).provider).toBe("console");
        expect(resolveEmailConfig({ nodeEnv: "test" }).provider).toBe("console");
    });

    it("insists on a real provider anywhere else, including when NODE_ENV was forgotten", () => {
        expect(() => resolveEmailConfig({ nodeEnv: "production" })).toThrow(/EMAIL_PROVIDER is required/);
        expect(() => resolveEmailConfig({ nodeEnv: undefined })).toThrow(/EMAIL_PROVIDER is required/);
    });

    it("refuses the console provider in production (it would print sign-in codes into the log)", () => {
        expect(() => resolveEmailConfig({ nodeEnv: "production", provider: "console" })).toThrow(/only allowed when NODE_ENV/);
        expect(() => resolveEmailConfig({ nodeEnv: undefined, provider: "console" })).toThrow(/only allowed when NODE_ENV/);
    });

    it("allows the memory provider only in test", () => {
        expect(resolveEmailConfig({ nodeEnv: "test", provider: "memory" }).provider).toBe("memory");
        expect(() => resolveEmailConfig({ nodeEnv: "development", provider: "memory" })).toThrow(/only allowed when NODE_ENV is "test"/);
        expect(() => resolveEmailConfig({ nodeEnv: "production", provider: "memory" })).toThrow(/only allowed when NODE_ENV is "test"/);
    });

    it("accepts resend everywhere, but only with its key and sender address", () => {
        for (const nodeEnv of ["production", "development", "test"]) {
            expect(resolveEmailConfig({ nodeEnv, ...resend })).toEqual({
                provider: "resend",
                resendApiKey: "re_test_key",
                from: "TradeOS <onboarding@resend.dev>"
            });
        }

        expect(() => resolveEmailConfig({ nodeEnv: "production", ...resend, resendApiKey: "" })).toThrow(/RESEND_API_KEY and EMAIL_FROM/);
        expect(() => resolveEmailConfig({ nodeEnv: "production", ...resend, from: "" })).toThrow(/RESEND_API_KEY and EMAIL_FROM/);
    });

    it("rejects a provider name it does not know", () => {
        expect(() => resolveEmailConfig({ nodeEnv: "development", provider: "sendgrid" })).toThrow(/must be one of/);
    });
});

describe("escapeHtml", () => {
    it("turns the characters that can start a tag or break out of an attribute into entities", () => {
        expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
            "&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;"
        );
    });
});

describe("the sign-up code email", () => {
    const email = otpEmail({ name: "Asha", code: "482913", minutes: 10 });

    it("contains the code and the lifetime in both the text and the HTML version", () => {
        expect(email.text).toContain("482913");
        expect(email.text).toContain("10 minutes");
        expect(email.html).toContain("482913");
        expect(email.html).toContain("10 minutes");
    });

    it("keeps the code out of the subject, which shows in notifications and mail lists", () => {
        expect(email.subject).toBe("Your TradeOS verification code");
        expect(email.subject).not.toContain("482913");
    });

    it("cannot be used to inject HTML through the name", () => {
        const hostile = otpEmail({ name: `<img src=x onerror=alert(1)><b>Eve</b>`, code: "123456", minutes: 10 });

        expect(hostile.html).not.toContain("<img");
        expect(hostile.html).not.toContain("<b>Eve");
        expect(hostile.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
        // The plain-text version is not HTML, so the name appears as typed
        expect(hostile.text).toContain("<img src=x onerror=alert(1)>");
    });
});

describe("sending through the providers", () => {
    beforeEach(() => clearOutbox());

    it("uses the memory provider in tests and keeps what was sent, with the configured sender", async () => {
        expect(getEmailProvider().name).toBe("memory");

        const result = await sendEmail({ to: "Asha@Example.com", subject: "Hello", text: "Body", html: "<p>Body</p>" });

        expect(result.id).toMatch(/^memory-/);
        expect(getOutbox()).toHaveLength(1);
        expect(getOutbox()[0]).toMatchObject({ to: "Asha@Example.com", subject: "Hello", text: "Body", html: "<p>Body</p>" });
        expect(getOutbox()[0].from).toMatch(/TradeOS/);
    });

    it("finds the newest email for an address regardless of letter case", async () => {
        await sendEmail({ to: "a@example.com", subject: "First", text: "1" });
        await sendEmail({ to: "b@example.com", subject: "Other", text: "x" });
        await sendEmail({ to: "a@example.com", subject: "Second", text: "2" });

        expect(getLastEmailTo("A@EXAMPLE.com").subject).toBe("Second");
        expect(getLastEmailTo("nobody@example.com")).toBeUndefined();
    });

    it("starts every test from an empty outbox after clearOutbox", async () => {
        await sendEmail({ to: "a@example.com", subject: "S", text: "t" });
        clearOutbox();

        expect(getOutbox()).toEqual([]);
    });

    it("refuses to send a message with no recipient, subject or plain text", async () => {
        await expect(sendEmail({ subject: "S", text: "t" })).rejects.toThrow(/needs a recipient/);
        await expect(sendEmail({ to: "a@example.com", text: "t" })).rejects.toThrow(/needs a recipient/);
        await expect(sendEmail({ to: "a@example.com", subject: "S" })).rejects.toThrow(/needs a recipient/);
        expect(getOutbox()).toHaveLength(0);
    });

    it("prints the email to the log with the console provider and sends nothing anywhere", async () => {
        const log = vi.spyOn(console, "log").mockImplementation(() => {});

        const provider = createConsoleProvider({ from: "TradeOS <dev@example.com>" });
        await provider.send({ to: "asha@example.com", subject: "Your code", text: "Code: 482913" });

        const printed = log.mock.calls.map((call) => call.join(" ")).join("\n");
        log.mockRestore();

        expect(printed).toContain("asha@example.com");
        expect(printed).toContain("Code: 482913");
        expect(printed).toContain("TradeOS <dev@example.com>");
    });
});
