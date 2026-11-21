// If all goes well env variables will be exported from this file , if any env variable not configured err will occur
//Import this file instead of using process.env

//Make sure to configure correct .env file we have two of them ,the other one is for testing purpose.
import dotenv from "dotenv";

import { resolveEmailConfig } from "./emailConfig.js";
import { resolveOtpSecret } from "./otpConfig.js";
import { resolveTrustProxyHops } from "./proxyConfig.js";

const envFile = process.env.NODE_ENV === "test"
    ? ".env.test"
    : ".env";

dotenv.config({ path: envFile });

const requiredEnvVariables = [
    "MONGODB_URI",
    "JWT_ACCESS_SECRET",
    "FRONTEND_URL"
];

for (const variable of requiredEnvVariables) {
    if (!process.env[variable]) {
        throw new Error(
            `Missing required environment variable: ${variable}`
        );
    }
}

// Development-only override: pretend the market is always open, so trading and price movement can be tried at night.
// It may only be on when NODE_ENV is EXPLICITLY "development" or "test". A production host that forgot to set
// NODE_ENV (it would default to development below) is caught too, because this reads the raw value.
const marketAlwaysOpen = process.env.MARKET_ALWAYS_OPEN === "true";

if (marketAlwaysOpen && !["development", "test"].includes(process.env.NODE_ENV)) {
    throw new Error(
        'MARKET_ALWAYS_OPEN=true is only allowed when NODE_ENV is "development" or "test". Remove it from this environment.'
    );
}

// Which email provider sends the sign-up codes (see config/emailConfig.js for the rules)
const email = resolveEmailConfig({
    nodeEnv: process.env.NODE_ENV,
    provider: process.env.EMAIL_PROVIDER,
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM
});

// The secret that protects the sign-up codes in the database (see config/otpConfig.js)
const otpSecret = resolveOtpSecret({
    secret: process.env.OTP_SECRET,
    jwtSecret: process.env.JWT_ACCESS_SECRET
});

// How many proxies are in front of the server (see config/proxyConfig.js)
const trustProxyHops = resolveTrustProxyHops(process.env.TRUST_PROXY_HOPS);

// Two quiet mistakes on a host. They do not stop the server (the settings are valid), so they are warned about loudly.
if (!process.env.NODE_ENV) {
    console.warn("WARNING: NODE_ENV is not set, so the server runs as 'development' (the login cookie is not marked secure). Set NODE_ENV=production on the host.");
}

if (process.env.NODE_ENV === "production" && trustProxyHops === 0) {
    console.warn("WARNING: TRUST_PROXY_HOPS is 0 in production. Behind a host's proxy every visitor then shares one rate-limit counter. Set it to the number of proxies in front of the server.");
}

export default {
    PORT: process.env.PORT || 8080,
    TRUST_PROXY_HOPS: trustProxyHops,
    OTP_SECRET: otpSecret,
    EMAIL_PROVIDER: email.provider,
    RESEND_API_KEY: email.resendApiKey,
    EMAIL_FROM: email.from,
    MARKET_ALWAYS_OPEN: marketAlwaysOpen,
    NODE_ENV: process.env.NODE_ENV || "development",
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL,
    // Optional: the one website address allowed to call this API (CORS). Defaults to the local Vite dev server.
    CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
    INDIAN_API_KEY: process.env.INDIAN_API_KEY,
    FYERS_APP_ID: process.env.FYERS_APP_ID,
    FYERS_APP_SECRET: process.env.FYERS_APP_SECRET,
    FYERS_REDIRECT_URI: process.env.FYERS_REDIRECT_URI,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};