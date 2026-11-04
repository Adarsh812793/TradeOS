//Handles http request and response
import config from "../../config/env.js";

import authService from "./auth.service.js"; //authService is an object containing many functions

import AppError from "../../utils/AppError.js";
import ERROR_CODES from "../../utils/errorCodes.js";
import asyncWrap from "../../utils/asyncWrap.js";

//I. Function to register a user
const register =asyncWrap(async (req, res, next) => {

        const { name, email, password } = req.body;

        const user = await authService.registerUser({
            name,
            email,
            password
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: user
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

        res.cookie("refreshToken", refreshToken, { //Sends a cookie to clients browser with name:refreshToken and object passed for settings
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

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
        res.cookie(
            "refreshToken",
            newRefreshToken,
            {
                httpOnly: true,
                secure:config.NODE_ENV === "production",
                sameSite: "lax",
                maxAge:7 * 24 * 60 * 60 * 1000
            });


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

export default {
    register,
    login,
    refresh,
    logout,
    changePassword
};