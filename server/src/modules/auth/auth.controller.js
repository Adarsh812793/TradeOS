//Handles http request and response
import config from "../../config/env.js";

import authService from "./auth.service.js"; //authService is an object containing many functions
import registrationService from "./registration.service.js"; //email sign-up: start and resend
import passwordResetService from "./passwordReset.service.js"; //forgot password: ask for a code, reset with it

import AppError from "../../utils/AppError.js";
import ERROR_CODES from "../../utils/errorCodes.js";
import asyncWrap from "../../utils/asyncWrap.js";

// Sends the refresh token to the browser as an httpOnly cookie (JavaScript on the page can never read it)
const setRefreshCookie = (res, refreshToken) => {
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};

// I-b. Function to START an email sign-up: emails a 6-digit code, creates no account yet
const startRegistration = asyncWrap(async (req, res, next) => {

        const { name, email, password } = req.body;

        const result = await registrationService.startRegistration({ name, email, password });

        res.status(202).json({
            success: true,
            message: "We sent a verification code to your email",
            data: result
        });

});

// I-c. Function to send a NEW code for a sign-up that is waiting for one
const resendRegistrationCode = asyncWrap(async (req, res, next) => {

        const result = await registrationService.resendRegistrationCode({ email: req.body.email });

        res.status(200).json({
            success: true,
            message: "We sent a new verification code to your email",
            data: result
        });

});

// I-d. Function to confirm the emailed code: creates the account and logs the person straight in
const verifyRegistration = asyncWrap(async (req, res, next) => {

        const { email, code } = req.body;

        const { accessToken, refreshToken, user } = await registrationService.verifyRegistration({ email, code });

        setRefreshCookie(res, refreshToken);

        res.status(201).json({
            success: true,
            message: "Email verified. Your account is ready.",
            data: {
                accessToken,
                user
            }
        });

});

// II.Function to log in a user
const login = asyncWrap(async (req, res, next) => {

        const { email, password } = req.body;

        //Get access and refresh token from service
        const { accessToken, refreshToken } =
            await authService.loginUser({
                email,
                password
            });

        setRefreshCookie(res, refreshToken);

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                accessToken
            }
        });
});

//III. Function to refresh the access token if it expires
//This function only called when POST api/auth/refresh
const refresh =asyncWrap( async (req, res, next) => {
        // cookie-parser puts cookies inside req.cookies
        const refreshToken = req.cookies.refreshToken;


        // Browser didn't send a refresh token
        if (!refreshToken) {
            throw new AppError("Refresh token missing, Did not recieve from browser",401,ERROR_CODES.REFRESH_TOKEN_MISSING);
        }


        // Ask service to validate + rotate token
        const {
            accessToken,
            refreshToken: newRefreshToken
        } = await authService.refreshAccessToken(
            refreshToken);


        // Replace old cookie with NEW refresh token
        setRefreshCookie(res, newRefreshToken);


        // Send NEW access token to React
        res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            data: {
                accessToken
            }
        });
});

// IV. Function to logout
const logout = asyncWrap(async (req, res, next) => {

        const refreshToken = req.cookies.refreshToken;

        // If there is no cookie, the user is already logged out
        if (!refreshToken) {

            return res.status(200).json({
                success: true,
                message: "Logged out successfully"
            });
        }


        // Revoke refresh session
        await authService.logoutUser(refreshToken);


        // Remove refresh token from browser
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "lax"
        });


        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
});

// V. Function to change the logged-in user's password and sign out every other device
const changePassword = asyncWrap(async (req, res, next) => {

        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        // The refresh cookie tells the service which device is asking, so that one stays logged in
        const result = await authService.changePassword(
            userId,
            { currentPassword, newPassword },
            req.cookies.refreshToken
        );

        res.status(200).json({
            success: true,
            message: "Password changed successfully",
            data: {
                signedOutOtherDevices: result.signedOutOtherDevices
            }
        });
});

// Function to ask for a forgot-password code (or a new one): the answer is the same whether or not the email has an account
const forgotPassword = asyncWrap(async (req, res, next) => {

        const result = await passwordResetService.requestPasswordReset({ email: req.body.email });

        res.status(202).json({
            success: true,
            message: "If that email has a TradeOS account, we sent a code to it",
            data: result
        });
});

// Function to set a new password with the emailed code: signs every device out, does NOT log the person in
const resetPassword = asyncWrap(async (req, res, next) => {

        const { email, code, newPassword } = req.body;

        await passwordResetService.resetPassword({ email, code, newPassword });

        res.status(200).json({
            success: true,
            message: "Your password was reset. Please log in with your new password.",
            data: null
        });
});

export default {
    forgotPassword,
    resetPassword,
    startRegistration,
    verifyRegistration,
    resendRegistrationCode,
    login,
    refresh,
    logout,
    changePassword
};