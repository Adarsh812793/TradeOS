import config from "../../config/env.js";
import userService from "./user.service.js";
import asyncWrap from "../../utils/asyncWrap.js";


// I. Function to getCurrentUser
const getCurrentUser = asyncWrap(async (req, res) => {
        // req.user was created by protect middleware
        const userId = req.user.userId;

        const user = await userService.getCurrentUser(
            userId
        );

        res.status(200).json({
            success: true,
            data: user
        });
});

// II. Function to update the logged-in user's name (body was already validated by the route)
const updateProfile = asyncWrap(async (req, res) => {
        const userId = req.user.userId;
        const { name } = req.body;

        const user = await userService.updateProfile(
            userId,
            { name }
        );

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: user
        });
});

// III. Function to save the uploaded profile photo (req.file was read and checked by the upload middleware)
const uploadAvatar = asyncWrap(async (req, res) => {
        const userId = req.user.userId;

        const user = await userService.uploadAvatar(
            userId,
            req.file
        );

        res.status(200).json({
            success: true,
            message: "Profile photo updated successfully",
            data: user
        });
});

// IV. Function to remove the logged-in user's profile photo
const removeAvatar = asyncWrap(async (req, res) => {
        const userId = req.user.userId;

        const user = await userService.removeAvatar(
            userId
        );

        res.status(200).json({
            success: true,
            message: "Profile photo removed successfully",
            data: user
        });
});


// V. Function to delete the logged-in user's account after the service re-checks their password
const deleteAccount = asyncWrap(async (req, res) => {
        const userId = req.user.userId;
        const { password } = req.body;

        await userService.deleteAccount(
            userId,
            password
        );

        // Their login cookie is useless now, so remove it from the browser (same options as logout)
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "lax"
        });

        res.status(200).json({
            success: true,
            message: "Account deleted successfully"
        });
});


export default {
    getCurrentUser,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    deleteAccount
};
