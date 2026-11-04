//When this HTTP request comes in, which controller should handle it
import express from "express";
import authController from "./auth.controller.js";

import validate from "../../middleware/validate.middleware.js";
import authRateLimiter, { passwordChangeRateLimiter, refreshRateLimiter } from "../../middleware/rateLimit.middleware.js";
import protect from "../../middleware/auth.middleware.js";
import checkRefreshCookie from "../../middleware/checkRefreshCookie.middleware.js";
import {registerSchema,loginSchema,changePasswordSchema} from "./auth.validation.js";


const router = express.Router();

//Route for register
router.post("/register",authRateLimiter,validate(registerSchema,"body"), authController.register); 

//Route for login
router.post("/login",authRateLimiter,validate(loginSchema,"body") ,authController.login);

//Route for refreshing the expired cookie
router.post("/refresh",refreshRateLimiter,checkRefreshCookie,authController.refresh);

//Reoute for logout
router.post('/logout',authController.logout);

//Route for changing the password: PATCH /api/auth/password -> checks the current password against users.passwordHash, saves the new hash, revokes the user's other refresh sessions and returns how many other devices were signed out ->Protected
router.patch("/password",protect,passwordChangeRateLimiter,validate(changePasswordSchema,"body"),authController.changePassword);

export default router;