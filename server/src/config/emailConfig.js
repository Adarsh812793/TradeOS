// Decides which email provider the server uses and refuses unsafe combinations. It is a pure function (no process.env
// inside), so every rule can be unit tested; config/env.js calls it once at startup and exports the result.
//
//   resend   sends real email through Resend: needs RESEND_API_KEY and EMAIL_FROM; the only one allowed in production
//   console  prints the email (and the code in it) to the server log: development and test only
//   memory   keeps the emails in memory so tests can read the code: test only
//
// `nodeEnv` is the RAW NODE_ENV. A production host that forgot to set it (it would default to "development" elsewhere)
// is caught too, because anything other than an explicit "development" or "test" counts as production here.
const PROVIDERS = ["console", "memory", "resend"];

export function resolveEmailConfig({ nodeEnv, provider, resendApiKey, from }) {
    const isTest = nodeEnv === "test";
    const isDevelopmentOrTest = nodeEnv === "development" || isTest;

    // With nothing chosen, development and test print to the console; everywhere else a real provider must be chosen
    const chosen = provider || (isDevelopmentOrTest ? "console" : "");

    if (!chosen) {
        throw new Error('EMAIL_PROVIDER is required in this environment. Set EMAIL_PROVIDER=resend (with RESEND_API_KEY and EMAIL_FROM).');
    }

    if (!PROVIDERS.includes(chosen)) {
        throw new Error(`EMAIL_PROVIDER must be one of: ${PROVIDERS.join(", ")} (got "${chosen}").`);
    }

    if (chosen === "memory" && !isTest) {
        throw new Error('EMAIL_PROVIDER=memory is only allowed when NODE_ENV is "test".');
    }

    if (chosen === "console" && !isDevelopmentOrTest) {
        throw new Error('EMAIL_PROVIDER=console prints sign-in codes to the log and is only allowed when NODE_ENV is "development" or "test". Use EMAIL_PROVIDER=resend.');
    }

    if (chosen === "resend" && (!resendApiKey || !from)) {
        throw new Error("EMAIL_PROVIDER=resend needs both RESEND_API_KEY and EMAIL_FROM to be set.");
    }

    return {
        provider: chosen,
        resendApiKey: resendApiKey || undefined,
        from: from || "TradeOS <no-reply@tradeos.local>"
    };
}
