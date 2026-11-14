import config from "../../config/env.js";
import { createConsoleProvider } from "./console.provider.js";
import { createMemoryProvider } from "./memory.provider.js";
import { createResendProvider } from "./resend.provider.js";

// The one place that decides how email is sent, like prices/price.provider.js decides where prices come from. A provider
// has the shape { name, send({ to, subject, text, html }) } and answers { id }. To use another service, write a provider
// with that shape and return it here; nothing else changes.
let provider;

export function getEmailProvider() {
    if (!provider) {
        if (config.EMAIL_PROVIDER === "memory") {
            provider = createMemoryProvider({ from: config.EMAIL_FROM });
        } else if (config.EMAIL_PROVIDER === "console") {
            provider = createConsoleProvider({ from: config.EMAIL_FROM });
        } else {
            // "resend": the config has already checked that the name is valid and that the key and sender are set
            provider = createResendProvider({ apiKey: config.RESEND_API_KEY, from: config.EMAIL_FROM });
        }
    }

    return provider;
}

// Sends one email through the chosen provider. The rest of the app only ever calls this.
//   message: { to, subject, text, html }   text is the plain version (always required), html the styled one (optional)
export async function sendEmail({ to, subject, text, html }) {
    if (!to || !subject || !text) {
        // A programming mistake, not something a user can cause: fail loudly instead of sending a broken email
        throw new Error("sendEmail needs a recipient (to), a subject and a plain-text body (text).");
    }

    return getEmailProvider().send({ to, subject, text, html });
}
