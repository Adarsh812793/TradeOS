import argon2 from "argon2";
import mongoose from "mongoose";

import User from "./user.model.js";
import Wallet from "../wallet/wallet.model.js";
import Holding from "../holdings/holding.model.js";
import Order from "../orders/order.model.js";
import Transaction from "../transactions/transaction.model.js";
import Watchlist from "../watchlist/watchlist.model.js";
import Notification from "../notifications/notification.model.js";
import RefreshSession from "../auth/refreshSession.model.js";

import AppError from "../../utils/AppError.js";
import ERROR_CODES from "../../utils/errorCodes.js";
import {
    deleteImage,
    isCloudinaryConfigured,
    uploadAvatarImage
} from "../../utils/cloudinary.js";

// I. Function to get user info
const getCurrentUser = async (userId) => {

    const user = await User.findById(userId)
        .select("-passwordHash");

    if (!user) {
        throw new AppError("User not found",404,ERROR_CODES.USER_NOT_FOUND);
    }

    return user;
};

// II. Function to change the user's name and return the updated profile (never the password hash)
const updateProfile = async (userId, { name }) => {

    const user = await User.findByIdAndUpdate(
        userId,
        { name },
        { returnDocument: "after", runValidators: true }
    ).select("-passwordHash");

    if (!user) {
        throw new AppError("User not found",404,ERROR_CODES.USER_NOT_FOUND);
    }

    return user;
};

// III. Function to upload a profile photo to Cloudinary, save its link on the user and return the updated profile
const uploadAvatar = async (userId, file) => {

    if (!isCloudinaryConfigured()) {
        throw new AppError(
            "Photo upload is not available right now",
            503,
            ERROR_CODES.IMAGE_UPLOAD_UNAVAILABLE
        );
    }

    const userExists = await User.exists({ _id: userId });

    if (!userExists) {
        throw new AppError("User not found",404,ERROR_CODES.USER_NOT_FOUND);
    }

    // A new upload overwrites the previous photo (same public id), so there is nothing old to delete
    let uploaded;

    try {
        uploaded = await uploadAvatarImage(file.buffer, userId);
    } catch (error) {
        console.error("Cloudinary upload failed:", error.message);

        throw new AppError(
            "Could not upload the image. Please try again.",
            502,
            ERROR_CODES.IMAGE_UPLOAD_FAILED
        );
    }

    try {
        return await User.findByIdAndUpdate(
            userId,
            { avatar: { url: uploaded.url, publicId: uploaded.publicId } },
            { returnDocument: "after", runValidators: true }
        ).select("-passwordHash");
    } catch (error) {
        // Saving the link failed, so do not leave an orphaned image on Cloudinary
        await deleteImage(uploaded.publicId);
        throw error;
    }
};

// IV. Function to remove the profile photo from Cloudinary and clear it on the user (fine to call when there is none)
const removeAvatar = async (userId) => {

    const user = await User.findById(userId).select("avatar");

    if (!user) {
        throw new AppError("User not found",404,ERROR_CODES.USER_NOT_FOUND);
    }

    await deleteImage(user.avatar?.publicId);

    return User.findByIdAndUpdate(
        userId,
        { avatar: { url: null, publicId: null } },
        { returnDocument: "after", runValidators: true }
    ).select("-passwordHash");
};


// V. Function to permanently delete the user and everything that belongs to them. The password must be given again.
const deleteAccount = async (userId, password) => {

    // 1. Find the user
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("User not found",404,ERROR_CODES.USER_NOT_FOUND);
    }

    // 2. Re-authentication: a stolen login alone must not be enough to erase an account
    const passwordValid = await argon2.verify(
        user.passwordHash,
        password
    );

    if (!passwordValid) {
        throw new AppError("Password is incorrect",400,ERROR_CODES.INVALID_PASSWORD);
    }

    // 3. Delete everything that belongs to the user together, or nothing at all.
    //    (Stocks and the FYERS token are shared by everyone, so they stay.)
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        await Transaction.deleteMany({ userId }, { session });
        await Order.deleteMany({ userId }, { session });
        await Holding.deleteMany({ userId }, { session });
        await Watchlist.deleteMany({ userId }, { session });
        await Notification.deleteMany({ userId }, { session });
        await Wallet.deleteMany({ userId }, { session });
        await RefreshSession.deleteMany({ userId }, { session });
        await User.deleteOne({ _id: userId }, { session });

        await session.commitTransaction();

    } catch (error) {

        await session.abortTransaction();

        throw error;

    } finally {

        await session.endSession();
    }

    // 4. The database is clean. Only now remove the photo from Cloudinary (never throws, so a
    //    leftover image can never turn a finished deletion into an error)
    await deleteImage(user.avatar?.publicId);
};


export default {
    getCurrentUser,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    deleteAccount
};
