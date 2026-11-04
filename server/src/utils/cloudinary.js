//Thin wrapper around the Cloudinary SDK so the rest of the app never touches it directly.
//Settings come from config/env.js (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET in server/.env).
import { v2 as cloudinary } from "cloudinary";

import config from "../config/env.js";

const AVATAR_FOLDER = "tradeos/avatars";

//True when all three Cloudinary settings are present
export const isCloudinaryConfigured = () =>
    Boolean(
        config.CLOUDINARY_CLOUD_NAME &&
        config.CLOUDINARY_API_KEY &&
        config.CLOUDINARY_API_SECRET
    );

//Gives the SDK its credentials the first time it is needed
let isSdkConfigured = false;

const ensureSdkConfigured = () => {
    if (isSdkConfigured) {
        return;
    }

    cloudinary.config({
        cloud_name: config.CLOUDINARY_CLOUD_NAME,
        api_key: config.CLOUDINARY_API_KEY,
        api_secret: config.CLOUDINARY_API_SECRET,
        secure: true
    });

    isSdkConfigured = true;
};

//Uploads an avatar (image bytes in memory) as a 256x256 square.
//Every user has one fixed public id, so a new upload replaces the old photo and nothing is left behind.
//Resolves with { url, publicId }.
export const uploadAvatarImage = (buffer, userId) => {

    ensureSdkConfigured();

    return new Promise((resolve, reject) => {

        const stream = cloudinary.uploader.upload_stream(
            {
                folder: AVATAR_FOLDER,
                public_id: String(userId),
                overwrite: true,
                invalidate: true,
                resource_type: "image",
                allowed_formats: ["jpg", "png", "webp"],
                transformation: [
                    { width: 256, height: 256, crop: "fill", gravity: "auto" }
                ]
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                resolve({
                    url: result.secure_url,
                    publicId: result.public_id
                });
            }
        );

        stream.end(buffer);
    });
};

//Deletes an image from Cloudinary. Never throws: a failed clean-up must not break the request that triggered it.
export const deleteImage = async (publicId) => {

    if (!publicId || !isCloudinaryConfigured()) {
        return false;
    }

    try {
        ensureSdkConfigured();
        await cloudinary.uploader.destroy(publicId, { invalidate: true });
        return true;
    } catch (error) {
        console.error("Cloudinary delete failed:", error.message);
        return false;
    }
};
