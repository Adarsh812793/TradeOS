//When this HTTP request comes in, which controller should handle it
import express from "express";
import authController from "./auth.controller.js";

import validate from "../../middleware/validate.middleware.js";
import authRateLimiter, { passwordChangeRateLimiter, refreshRateLimiter, signupRateLimiter } from "../../middleware/rateLimit.middleware.js";
import protect from "../../middleware/auth.middleware.js";
import checkRefreshCookie from "../../middleware/checkRefreshCookie.middleware.js";
import {registerSchema,loginSchema,changePasswordSchema,resendCodeSchema} from "./auth.validation.js";


const router = express.Router();

//Route for register
router.post("/register",authRateLimiter,validate(registerSchema,"body"), authController.register); 

//Route for starting an email sign-up: POST /api/auth/register/start -> reads users (is the email taken?), writes ONE pending_registrations record (name, email, argon2 password hash, HMAC of the code) and emails the 6-digit code; creates no User or Wallet; returns 202 { email, resendAvailableInSeconds, codeExpiresInMinutes } and never the code
router.post("/register/start",signupRateLimiter,validate(registerSchema,"body"),authController.startRegistration);

//Route for sending a new code: POST /api/auth/register/resend -> updates the pending_registrations record of this email (new code hash, attempts back to 0, resend counter +1) and emails the new code; returns { email, resendAvailableInSeconds, codeExpiresInMinutes }, or 429 with details.retryAfterSeconds while the cooldown runs
router.post("/register/resend",signupRateLimiter,validate(resendCodeSchema,"body"),authController.resendRegistrationCode);

//Route for login
router.post("/login",authRateLimiter,validate(loginSchema,"body") ,authController.login);

//Route for refreshing the expired cookie
router.post("/refresh",refreshRateLimiter,checkRefreshCookie,authController.refresh);

//Reoute for logout
router.post('/logout',authController.logout);

//Route for changing the password: PATCH /api/auth/password -> checks the current password against users.passwordHash, saves the new hash, revokes the user's other refresh sessions and returns how many other devices were signed out ->Protected
router.patch("/password",protect,passwordChangeRateLimiter,validate(changePasswordSchema,"body"),authController.changePassword);

export default router;