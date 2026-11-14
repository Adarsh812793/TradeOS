import { describe, it, expect, vi, afterEach } from "vitest";

import { createResendProvider } from "../src/modules/email/resend.provider.js";

// Unit tests of the Resend provider with a FAKE fetch: nothing is sent to Resend, no key is needed.

const API_KEY = "re_super_secret_test_key_123";
const FROM = "TradeOS <onboarding@resend.dev>";

// A fake fetch that answers with the given status and JSON body, and remembers how it was called
function fakeFetch(status, json) {
    return vi.fn(async () => ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => json
    }));
}

describe("the Resend provider", () => {
    afterEach(() => vi.restoreAllMocks());

    it("sends the request Resend expects and returns the message id", async () => {
        const fetchImpl = fakeFetch(200, { id: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" });
        const provider = createResendProvider({ apiKey: API_KEY, from: FROM, fetchImpl });

        const result = await provider.send({ to: "asha@example.com", subject: "Hello", text: "Body", html: "<p>Body</p>" });

        expect(result).toEqual({ id: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" });
        expect(fetchImpl).toHaveBeenCalledTimes(1);

        const [url, options] = fetchImpl.mock.calls[0];
        expect(url).toBe("https://api.resend.com/emails");
        expect(options.method).toBe("POST");
        expect(options.headers).toEqual({ Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" });
        expect(JSON.parse(options.body)).toEqual({
            from: FROM,
            to: ["asha@example.com"],
            subject: "Hello",
            text: "Body",
            html: "<p>Body</p>"
        });
    });

    it("leaves html out of the request when the message has none", async () => {
        const fetchImpl = fakeFetch(200, { id: "x" });

        await createResendProvider({ apiKey: API_KEY, from: FROM, fetchImpl }).send({ to: "a@example.com", subject: "S", text: "t" });

        expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).not.toHaveProperty("html");
    });

    it("gives up after a time limit instead of waiting for ever (the request carries an abort signal)", async () => {
        const fetchImpl = fakeFetch(200, { id: "x" });

        await createResendProvider({ apiKey: API_KEY, from: FROM, fetchImpl }).send({ to: "a@example.com", subject: "S", text: "t" });

        expect(fetchImpl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    });

    it("turns a refusal into EMAIL_SEND_FAILED (503), logs the reason for the developer and hides it from the user", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {});
        const fetchImpl = fakeFetch(403, {
            statusCode: 403,
            name: "validation_error",
            message: "You can only send testing emails to your own email address (owner@example.com)."
        });

        const error = await createResendProvider({ apiKey: API_KEY, from: FROM, fetchImpl })
            .send({ to: "stranger@example.com", subject: "S", text: "t" })
            .catch((caught) => caught);

        expect(error.statusCode).toBe(503);
        expect(error.errorCode).toBe("EMAIL_SEND_FAILED");
        expect(error.message).toBe("We couldn't send the email right now. Please try again in a moment.");

        // The reason is in the server log, without the key and without the recipient
        const logged = log.mock.calls.map((call) => call.join(" ")).join("\n");
        expect(logged).toContain("403");
        expect(logged).toContain("validation_error");
        expect(logged).not.toContain(API_KEY);
        expect(logged).not.toContain("stranger@example.com");
        // ... and none of it reaches the user
        expect(error.message).not.toContain("own email address");
    });

    it("turns a network failure or a timeout into the same error", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {});

        for (const failure of [new TypeError("fetch failed"), new DOMException("The operation timed out", "TimeoutError")]) {
            const fetchImpl = vi.fn(async () => { throw failure; });

            const error = await createResendProvider({ apiKey: API_KEY, from: FROM, fetchImpl })
                .send({ to: "a@example.com", subject: "S", text: "t" })
                .catch((caught) => caught);

            expect(error.errorCode).toBe("EMAIL_SEND_FAILED");
            expect(error.statusCode).toBe(503);
        }

        expect(log).toHaveBeenCalledTimes(2);
    });

    it("copes with an error answer that is not JSON", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const fetchImpl = vi.fn(async () => ({ ok: false, status: 502, json: async () => { throw new SyntaxError("not json"); } }));

        const error = await createResendProvider({ apiKey: API_KEY, from: FROM, fetchImpl })
            .send({ to: "a@example.com", subject: "S", text: "t" })
            .catch((caught) => caught);

        expect(error.errorCode).toBe("EMAIL_SEND_FAILED");
    });

    it("never puts the API key in an error", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});

        const error = await createResendProvider({ apiKey: API_KEY, from: FROM, fetchImpl: fakeFetch(401, { name: "missing_api_key", message: "bad" }) })
            .send({ to: "a@example.com", subject: "S", text: "t" })
            .catch((caught) => caught);

        expect(error.message).not.toContain(API_KEY);
        expect(JSON.stringify({ message: error.message, stack: error.stack })).not.toContain(API_KEY);
    });
});
