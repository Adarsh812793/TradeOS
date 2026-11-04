import rateLimit from "express-rate-limit";

//Allow maximum 10 reqs in 15 mins
const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication attempts. Please try again later."
    }
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