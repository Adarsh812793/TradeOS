import AppError from "../../utils/AppError.js";
import ERROR_CODES from "../../utils/errorCodes.js";

// The email provider that really sends mail, through Resend's HTTP API. It is the same call as Resend's "first email"
// example, made with fetch (built into Node) instead of their npm package, so there is no extra dependency.
//   POST https://api.resend.com/emails   Authorization: Bearer <API key>   body: { from, to, subject, text, html }
const RESEND_URL = "https://api.resend.com/emails";

// How long to wait for Resend before giving up (a sign-up request must not hang for minutes)
const TIMEOUT_MS = 10_000;

// What the user is told when sending fails. It never contains the key or Resend's own message.
const USER_MESSAGE = "We couldn't send the email right now. Please try again in a moment.";

// A provider with the shared shape { name, send(message) }.
//   apiKey / from  from the config      fetchImpl  fetch itself; tests pass a fake one so nothing is sent for real
export function createResendProvider({ apiKey, from, fetchImpl = globalThis.fetch }) {
    return {
        name: "resend",

        async send({ to, subject, text, html }) {
            // Only the parts that exist go into the request
            const body = { from, to: [to], subject, text };
            if (html) body.html = html;

            let response;

            try {
                response = await fetchImpl(RESEND_URL, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(TIMEOUT_MS)
                });
            } catch (error) {
                // No answer at all: offline, DNS failure or the timeout above
                console.error(`[email] Resend could not be reached: ${error.name}`);

                throw new AppError(USER_MESSAGE, 503, ERROR_CODES.EMAIL_SEND_FAILED);
            }

            // Resend answers { id } on success and { statusCode, name, message } on failure
            const answer = await response.json().catch(() => ({}));

            if (!response.ok) {
                // The details go to the server log only (never the key, never the recipient) so a developer can fix it,
                // for example "domain not verified" or "you can only send to your own address"
                console.error(`[email] Resend refused the message: ${response.status} ${answer.name ?? ""} ${answer.message ?? ""}`.trim());

                throw new AppError(USER_MESSAGE, 503, ERROR_CODES.EMAIL_SEND_FAILED);
            }

            return { id: answer.id ?? null };
        }
    };
}
