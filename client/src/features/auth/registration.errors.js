// Turns what the server said about the email sign-up into plain language and a clear NEXT STEP for the page.
// Pure (no React, no browser), so every case can be checked on its own. The error comes from lib/api.js: a normal Error
// with `.data` (the server's body: { message, errorCode, details }).
//
// Returns { message, action, attemptsLeft, retryAfterSeconds }
//   message            what to show the person
//   action             what the page should do about it:
//                        "resend"   offer a new code (the code is expired or used up)
//                        "restart"  the sign-up is gone: go back to the first step
//                        "login"    the email already has an account: point at the login page
//                        null       nothing special: just show the message and let them try again
//   attemptsLeft       guesses left for the current code (only after a wrong code)
//   retryAfterSeconds  seconds until another email may be sent (only when asked too soon)

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

// `step` is "start" (the details form, and re-sending) or "verify" (the code step): a few answers read differently in each.
export function describeRegistrationError(error, step = "start") {
    const code = error?.data?.errorCode;
    const details = error?.data?.details ?? {};
    const fallback = error?.message || "Something went wrong. Please try again.";

    switch (code) {
        case "OTP_INVALID": {
            const attemptsLeft = details.attemptsLeft ?? 0;

            return {
                message:
                    attemptsLeft > 0
                        ? `That code isn't right. ${plural(attemptsLeft, "attempt")} left.`
                        : "That code isn't right and you have no attempts left. Send a new code to try again.",
                action: attemptsLeft > 0 ? null : "resend",
                attemptsLeft
            };
        }

        case "OTP_EXPIRED":
            return { message: "This code has expired. Send a new one.", action: "resend" };

        case "OTP_ATTEMPTS_EXCEEDED":
            return { message: "Too many wrong codes. Send a new one to try again.", action: "resend" };

        case "OTP_RESEND_TOO_SOON": {
            const seconds = details.retryAfterSeconds ?? 60;

            return {
                message: `Please wait ${plural(seconds, "second")} before asking for another code.`,
                action: null,
                retryAfterSeconds: seconds
            };
        }

        case "OTP_RESEND_LIMIT":
            return {
                message: "You've asked for too many codes. Please wait a few minutes, then start signing up again.",
                action: "restart"
            };

        case "NO_PENDING_REGISTRATION":
            return { message: "This sign-up has expired. Please start again.", action: "restart" };

        case "USER_ALREADY_EXISTS":
            // At the start the email simply has an account; at the code step it means this sign-up was already completed
            return {
                message: step === "verify" ? "This email is already verified." : "An account with this email already exists.",
                action: "login"
            };

        default:
            // EMAIL_SEND_FAILED, VALIDATION_ERROR, rate limits and anything else: the server's own wording is already plain
            return { message: fallback, action: null };
    }
}
