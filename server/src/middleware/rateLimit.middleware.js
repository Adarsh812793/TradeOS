import rateLimit from "express-rate-limit";
import config from "../config/env.js";

//Login: at most 10 requests per IP in 15 minutes (slows down password guessing)
export const AUTH_RATE_LIMIT = 10;

//The email sign-up routes (start, resend and later verify) get their OWN counter. One sign-up uses several requests, and
//sharing the login limit of 10 would let a sign-up block the same person from logging in.
export const SIGNUP_RATE_LIMIT = 20;

//The forgot-password routes get their OWN counter too, so a reset cannot use up the login or sign-up allowance
export const PASSWORD_RESET_RATE_LIMIT = 20;

//Renewing the access token is routine (every page load, and about every 15 minutes per open tab), not a login attempt,
//so it has its own looser limit and its own counter. Sharing the limit of 10 would log people out.
export const REFRESH_RATE_LIMIT = 100;

//Builds a limiter that allows `limit` requests per IP in 15 minutes.
//The test suite registers and logs in dozens of users from one IP, so these limiters are switched off when
//NODE_ENV=test. A test can pass its own `skip` to get an ACTIVE limiter and prove that it blocks.
export const createIpRateLimiter = ({
    limit,
    message,
    skip = () => config.NODE_ENV === "test"
}) =>
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit,
        skip,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: {
            success: false,
            message
        }
    });

//POST /api/auth/login (the email sign-up routes have their own limiter below)
const authRateLimiter = createIpRateLimiter({
    limit: AUTH_RATE_LIMIT,
    message: "Too many authentication attempts. Please try again later."
});

//POST /api/auth/register/start, /register/resend and /register/verify: at most 20 requests per IP in 15 minutes
export const signupRateLimiter = createIpRateLimiter({
    limit: SIGNUP_RATE_LIMIT,
    message: "Too many sign-up attempts. Please try again later."
});

//POST /api/auth/password/forgot and /password/reset: at most 20 requests per IP in 15 minutes
export const passwordResetRateLimiter = createIpRateLimiter({
    limit: PASSWORD_RESET_RATE_LIMIT,
    message: "Too many password reset attempts. Please try again later."
});

//POST /api/auth/refresh
export const refreshRateLimiter = createIpRateLimiter({
    limit: REFRESH_RATE_LIMIT,
    message: "Too many token renewals. Please try again later."
});

//Allow maximum 20 photo uploads per hour (per IP)
export const uploadRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many photo uploads. Please try again later."
    }
});

//Builds a limiter that allows 5 FAILED attempts per user per 15 minutes (successful requests are not counted).
//Needs the user to be logged in already (req.user is set by the protect middleware), so it is counted per account, not per IP.
//Every limiter made here keeps its own counter.
const createFailedAttemptLimiter = () =>
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 5,
        skipSuccessfulRequests: true,
        keyGenerator: (req) => req.user.userId,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: {
            success: false,
            message: "Too many incorrect attempts. Please try again later."
        }
    });

//PATCH /api/auth/password
export const passwordChangeRateLimiter = createFailedAttemptLimiter();

//DELETE /api/users/me
export const accountDeletionRateLimiter = createFailedAttemptLimiter();

export default authRateLimiter;