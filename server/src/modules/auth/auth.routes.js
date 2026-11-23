//When this HTTP request comes in, which controller should handle it
import express from "express";
import authController from "./auth.controller.js";

import validate from "../../middleware/validate.middleware.js";
import authRateLimiter, { passwordChangeRateLimiter, passwordResetRateLimiter, refreshRateLimiter, signupRateLimiter } from "../../middleware/rateLimit.middleware.js";
import protect from "../../middleware/auth.middleware.js";
import checkRefreshCookie from "../../middleware/checkRefreshCookie.middleware.js";
import {registerSchema,loginSchema,changePasswordSchema,resendCodeSchema,verifyCodeSchema,forgotPasswordSchema,resetPasswordSchema} from "./auth.validation.js";


const router = express.Router();

//Route for starting an email sign-up: POST /api/auth/register/start -> reads users (is the email taken?), writes ONE pending_registrations record (name, email, argon2 password hash, HMAC of the code) and emails the 6-digit code; creates no User or Wallet; returns 202 { email, resendAvailableInSeconds, codeExpiresInMinutes } and never the code
router.post("/register/start",signupRateLimiter,validate(registerSchema,"body"),authController.startRegistration);

//Route for sending a new code: POST /api/auth/register/resend -> updates the pending_registrations record of this email (new code hash, attempts back to 0, resend counter +1) and emails the new code; returns { email, resendAvailableInSeconds, codeExpiresInMinutes }, or 429 with details.retryAfterSeconds while the cooldown runs
router.post("/register/resend",signupRateLimiter,validate(resendCodeSchema,"body"),authController.resendRegistrationCode);

//Route for confirming the emailed code: POST /api/auth/register/verify -> counts the guess on the pending_registrations record (max 5 per code), and on the right code creates the user (email verified), the wallet and the welcome notification in ONE transaction while deleting the pending record, then starts a login: refresh token cookie + returns 201 { accessToken, user }
router.post("/register/verify",signupRateLimiter,validate(verifyCodeSchema,"body"),authController.verifyRegistration);

//Route for asking for a forgot-password code (also for a NEW one): POST /api/auth/password/forgot -> reads users by email and, only when the account exists and the cooldown (60 s) and re-send cap (5) allow it, writes ONE password_resets record (HMAC of the code, never the code) and emails the 6-digit code in the background; ALWAYS returns the same 202 { email, resendAvailableInSeconds, codeExpiresInMinutes } so nobody can learn which emails have accounts
router.post("/password/forgot",passwordResetRateLimiter,validate(forgotPasswordSchema,"body"),authController.forgotPassword);

//Route for setting a new password with the emailed code: POST /api/auth/password/reset -> counts the guess on the password_resets record (max 5 per code) and on the right code, in ONE transaction, deletes that record, saves the new argon2 hash on the user, revokes EVERY refresh session, marks the email verified and creates a notification; returns 200 with no data (the person logs in again), and ONE 400 OTP_INVALID for every kind of failure
router.post("/password/reset",passwordResetRateLimiter,validate(resetPasswordSchema,"body"),authController.resetPassword);

//Route for login
router.post("/login",authRateLimiter,validate(loginSchema,"body") ,authController.login);

//Route for refreshing the expired cookie
router.post("/refresh",refreshRateLimiter,checkRefreshCookie,authController.refresh);

//Reoute for logout
router.post('/logout',authController.logout);

//Route for changing the password: PATCH /api/auth/password -> checks the current password against users.passwordHash, saves the new hash, revokes the user's other refresh sessions and returns how many other devices were signed out ->Protected
router.patch("/password",protect,passwordChangeRateLimiter,validate(changePasswordSchema,"body"),authController.changePassword);

export default router;