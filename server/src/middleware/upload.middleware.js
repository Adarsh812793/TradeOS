//Handles profile-photo uploads: reads the file into memory (nothing is written to disk) and checks it.
//Used as: readAvatarUpload -> requireValidImage -> controller
import multer from "multer";

import AppError from "../utils/AppError.js";
import ERROR_CODES from "../utils/errorCodes.js";
import { detectImageType } from "../utils/imageType.js";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; //2 MB

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_IMAGE_BYTES,
        files: 1
    },
    //First check: the type the browser says the file has
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(new AppError(
                "Only JPG, PNG or WebP images are allowed",
                400,
                ERROR_CODES.INVALID_IMAGE
            ));
        }

        cb(null, true);
    }
});

//Reads one image from the form field "avatar" and turns upload problems into friendly 400 errors
export const readAvatarUpload = (req, res, next) => {

    upload.single("avatar")(req, res, (error) => {

        if (!error) {
            return next();
        }

        if (error instanceof AppError) {
            return next(error);
        }

        if (error.code === "LIMIT_FILE_SIZE") {
            return next(new AppError(
                "The image is too large. The maximum size is 2 MB.",
                400,
                ERROR_CODES.IMAGE_TOO_LARGE
            ));
        }

        if (error.code === "LIMIT_UNEXPECTED_FILE") {
            return next(new AppError(
                'Send the image in the form field named "avatar"',
                400,
                ERROR_CODES.INVALID_IMAGE
            ));
        }

        //Anything else (for example a broken multipart body) is the client's fault too
        return next(new AppError(
            "Could not read the uploaded file",
            400,
            ERROR_CODES.INVALID_IMAGE
        ));
    });
};

//Second check: a file arrived and its real content (first bytes) is a JPG, PNG or WebP
export const requireValidImage = (req, res, next) => {

    if (!req.file) {
        return next(new AppError(
            "Please choose an image to upload",
            400,
            ERROR_CODES.INVALID_IMAGE
        ));
    }

    if (!detectImageType(req.file.buffer)) {
        return next(new AppError(
            "The file is not a valid JPG, PNG or WebP image",
            400,
            ERROR_CODES.INVALID_IMAGE
        ));
    }

    next();
};
