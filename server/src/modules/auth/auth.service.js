// File contains 4 functions (register,login,refreshToken,logout)
import argon2 from "argon2";
import crypto from "crypto";
import mongoose from "mongoose";

//Models
import User from "../users/user.model.js";
import Wallet from "../wallet/wallet.model.js";
import RefreshSession from "./refreshSession.model.js";

//utils
import AppError from "../../utils/AppError.js";
import ERROR_CODES from "../../utils/errorCodes.js";

//notifications
import notificationService from "../notifications/notification.service.js";
import { welcomeTemplate, passwordChangedTemplate } from "../notifications/notification.templates.js";

import { createAccessToken,createRefreshToken,hashRefreshToken,createTokenFamilyId } from "./auth.tokens.js";

// Virtual money every new account starts with
const STARTING_BALANCE = 100000;

//I. Function that creates a user and also wallet at the same time using transactional properties
const registerUser = async ({ name, email, password }) => {

    // ==========================================
    // Start MongoDB session
    // ==========================================

    const session = await mongoose.startSession();


    try {

        // ==========================================
        // Start transaction
        // ==========================================

        session.startTransaction();


        // ==========================================
        // Check if user already exists
        // ==========================================

        const existingUser = await User.findOne({
            email
        }).session(session);


        if (existingUser) {
            throw new AppError("User already exists",409,ERROR_CODES.USER_ALREADY_EXISTS);
        }


        // ==========================================
        // Hash password
        // ==========================================

        const passwordHash = await argon2.hash(password);


        // ==========================================
        // Create user
        // ==========================================

        const [user] = await User.create(
            [
                {
                    name,
                    email,
                    passwordHash
                }
            ],
            {
                session
            }
        );


        // ==========================================
        // Create wallet
        // ==========================================

        await Wallet.create(
            [
                {
                    userId: user._id,
                    balance: STARTING_BALANCE,
                    currency: "INR"
                }
            ],
            {
                session
            }
        );


        // ==========================================
        // Create welcome notification (same transaction as the user)
        // ==========================================

        await notificationService.createNotification(
            user._id,
            welcomeTemplate({ startingBalance: STARTING_BALANCE }),
            { session }
        );


        // ==========================================
        // Everything succeeded
        // Commit transaction
        // ==========================================

        await session.commitTransaction();


        return {
            id: user._id,
            name: user.name,
            email: user.email
        };


    } catch (error) {

        // ==========================================
        // Something failed
        // Roll back everything
        // ==========================================

        await session.abortTransaction();

        throw error;

    } finally {

        // ==========================================
        // Always close session
        // ==========================================

        await session.endSession();
    }
};

//II. Function to login user and returns access and refresh token
const loginUser = async ({ email, password }) => {

    // 1. Find user
    const user = await User.findOne({ email });

    if (!user) {
        throw new AppError("Invalid email or password",401,ERROR_CODES.INVALID_CREDENTIALS);
    }

    // 2. Verify password
    const passwordValid = await argon2.verify(
        user.passwordHash,
        password
    );

    if (!passwordValid) {
        throw new AppError("Invalid email or password",401,ERROR_CODES.INVALID_CREDENTIALS);
    }

    // 3. Create access JWT
    const accessToken = createAccessToken(user);

    // 4. Create family id for refresh tokens
    const familyId=createTokenFamilyId();

    // 5. Create random refresh token
    const refreshToken = createRefreshToken();

    // 6. Hash refresh token for DB
    const tokenHash = hashRefreshToken(refreshToken);

    // 7. Set expiry
    const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000 //Refresh token stored for 7 days
    );

    // 8. Store refresh session
    await RefreshSession.create({
        userId: user._id,
        tokenHash,
        familyId,
        expiresAt
    });

    // 9. Return both
    return {
        accessToken,
        refreshToken
    };
};

// A refresh token that was rotated less than this long ago may legitimately be presented once more by the
// same browser (two tabs refreshing together, or a response that was lost before it arrived). That is treated
// as a race, not as theft. Presenting an older rotated token still revokes the whole family.
const REFRESH_REUSE_GRACE_MS = 10 * 1000;

// Saves a new refresh session in the given family and returns the raw tokens (only the hash is stored).
const createSessionTokens = async (user, familyId) => {
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken();

    const session = await RefreshSession.create({
        userId: user._id,
        tokenHash: hashRefreshToken(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    return { accessToken, refreshToken, sessionId: session._id };
};

//III. Function to create a new session (new access and refresh token), rotating the old refresh token.
// The old token is claimed with ONE atomic database update, so two simultaneous refreshes can never both rotate it.
// Reuse of an already-rotated token is theft (whole family revoked), unless it happened within the grace period.(10s)
const refreshAccessToken = async (refreshToken) => {
    // 1. Hash the raw refresh token received from the cookie
    const tokenHash = hashRefreshToken(refreshToken);
    const now = new Date();

    // 2. Find the refresh session associated with this token
    const session = await RefreshSession.findOne({ tokenHash });

    // 3. Reject if the refresh token does not exist in the database
    if (!session) {
        throw new AppError("Invalid refresh token", 401,ERROR_CODES.INVALID_REFRESH_TOKEN);
    }

    // 4. The token was already used or revoked
    if (session.revokedAt) {
        const rotatedRecently =
            session.rotatedAt && now - session.rotatedAt < REFRESH_REUSE_GRACE_MS;

        // A recent rotation only counts as a harmless race while the login is still alive
        // (a logout in between revokes the newer token, and the old one must not bring it back)
        const loginStillAlive = rotatedRecently && await RefreshSession.exists({
            familyId: session.familyId,
            revokedAt: null,
            expiresAt: { $gt: now }
        });

        if (!loginStillAlive) {
            // Revoke every token belonging to the same token family: this may be token theft
            await RefreshSession.updateMany(
                { familyId: session.familyId },
                { $set: { revokedAt: now } }
            );

            throw new AppError("Refresh token reuse detected", 401,ERROR_CODES.REFRESH_TOKEN_REUSE);
        }

        // Within the grace period: give this browser a fresh pair in the same family.
        // The older sibling is left alone and simply expires, because only one cookie exists per browser.
        const graceUser = await User.findById(session.userId);

        if (!graceUser) {
            throw new AppError("User not found", 401,ERROR_CODES.USER_NOT_FOUND);
        }

        const { accessToken, refreshToken: graceRefreshToken } =
            await createSessionTokens(graceUser, session.familyId);

        return { accessToken, refreshToken: graceRefreshToken };
    }

    // 5. Reject the token if it has expired
    if (session.expiresAt < now) {
        session.revokedAt = now;
        await session.save();

        throw new AppError("Refresh token expired", 401,ERROR_CODES.REFRESH_TOKEN_EXPIRED);
    }

    // 6. Find the user associated with this refresh session
    const user = await User.findById(session.userId);

    // 7. Reject if the user no longer exists
    if (!user) {
        throw new AppError("User not found", 401,ERROR_CODES.USER_NOT_FOUND);
    }

    // 8. Create the NEW session first, so that the moment the old token shows as rotated its successor already exists
    const tokens = await createSessionTokens(user, session.familyId);

    // 9. Atomically claim the old token: only one request can change revokedAt from null
    const claimed = await RefreshSession.findOneAndUpdate(
        { _id: session._id, revokedAt: null },
        { $set: { revokedAt: now, rotatedAt: now } }
    );

    // 10. Lost a race with another request that rotated the same token a moment ago:
    //     drop the extra session and answer again (this time it takes the grace-period path above)
    if (!claimed) {
        await RefreshSession.deleteOne({ _id: tokens.sessionId });

        return refreshAccessToken(refreshToken);
    }

    // 11. Return the new tokens to the controller
    return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
    };
};

//IV. Function to logout the user

// IV. Function to logout the user
const logoutUser = async (refreshToken) => {

    // 1. Hash the raw refresh token received from the browser
    const tokenHash = hashRefreshToken(refreshToken);

    // 2. Find the refresh session associated with this token
    const session = await RefreshSession.findOne({ tokenHash });

    // 3. Return if the session does not exist or is already revoked
    if (!session || session.revokedAt) {
        return;
    }

    // 4. Revoke the session instead of deleting it
    session.revokedAt = new Date();

    // 5. Save the revoked session in MongoDB
    await session.save();
};


// V. Function to change a logged-in user's password. It checks the current password, saves the new hash and signs out
// every OTHER device (their refresh sessions are revoked), while the device making the request stays logged in.
const changePassword = async (userId, { currentPassword, newPassword }, currentRefreshToken) => {

    // 1. Find the user
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("User not found",404,ERROR_CODES.USER_NOT_FOUND);
    }

    // 2. The current password must be right (so a stolen access token alone cannot take over the account)
    const currentPasswordValid = await argon2.verify(
        user.passwordHash,
        currentPassword
    );

    if (!currentPasswordValid) {
        throw new AppError("Current password is incorrect",400,ERROR_CODES.INVALID_CURRENT_PASSWORD);
    }

    // 3. A "change" to the same password would only sign other devices out for no reason
    if (currentPassword === newPassword) {
        throw new AppError("New password must be different from your current password",400,ERROR_CODES.PASSWORD_UNCHANGED);
    }

    // 4. Hash the new password (slow on purpose, so do it before opening the transaction)
    const newPasswordHash = await argon2.hash(newPassword);

    // 5. Work out which login (token family) belongs to the device making this request.
    //    If it cannot be found (no cookie, already revoked), every session is revoked, which is the safe side.
    let currentFamilyId = null;

    if (currentRefreshToken) {
        const currentSession = await RefreshSession.findOne({
            tokenHash: hashRefreshToken(currentRefreshToken),
            userId,
            revokedAt: null
        });

        currentFamilyId = currentSession?.familyId ?? null;
    }

    // 6. Save the new password and revoke the other sessions together, or neither
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        await User.updateOne(
            { _id: userId },
            { $set: { passwordHash: newPasswordHash } },
            { session }
        );

        const otherSessions = {
            userId,
            revokedAt: null,
            expiresAt: { $gt: new Date() } // only logins that are still alive count as a device
        };

        if (currentFamilyId) {
            otherSessions.familyId = { $ne: currentFamilyId };
        }

        const revoked = await RefreshSession.updateMany(
            otherSessions,
            { $set: { revokedAt: new Date() } },
            { session }
        );

        await notificationService.createNotification(
            userId,
            passwordChangedTemplate(),
            { session }
        );

        await session.commitTransaction();

        return { signedOutOtherDevices: revoked.modifiedCount };

    } catch (error) {

        await session.abortTransaction();

        throw error;

    } finally {

        await session.endSession();
    }
};

export default {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changePassword
};