    import express from "express";
    import userController from "./user.controller.js";
    import protect from "../../middleware/auth.middleware.js";

    import validate from "../../middleware/validate.middleware.js";
    import { updateProfileSchema, deleteAccountSchema } from "./user.validation.js";

    import { uploadRateLimiter, accountDeletionRateLimiter } from "../../middleware/rateLimit.middleware.js";
    import { readAvatarUpload, requireValidImage } from "../../middleware/upload.middleware.js";


    const router = express.Router();

    //I. Route to get user info ->Protected
    router.get(
        "/me",
        protect,
        userController.getCurrentUser
    );

    //II. PATCH /api/users/me -> updates the name in the users collection and returns the updated profile (no password hash) ->Protected
    router.patch(
        "/me",
        protect,
        validate(updateProfileSchema,"body"),
        userController.updateProfile
    );

    //III. POST /api/users/me/avatar -> uploads the photo (form field "avatar", JPG/PNG/WebP, max 2 MB) to Cloudinary, saves its url/publicId on the user document and returns the updated profile ->Protected
    router.post(
        "/me/avatar",
        protect,
        uploadRateLimiter,
        readAvatarUpload,
        requireValidImage,
        userController.uploadAvatar
    );

    //IV. DELETE /api/users/me/avatar -> deletes the photo from Cloudinary, clears url/publicId on the user document and returns the updated profile ->Protected
    router.delete(
        "/me/avatar",
        protect,
        userController.removeAvatar
    );


    //V. DELETE /api/users/me -> after re-checking the password, deletes the user and all their wallet, holdings, orders, transactions, watchlist and login sessions from the database (and the photo from Cloudinary), clears the login cookie and returns a confirmation ->Protected
    router.delete(
        "/me",
        protect,
        accountDeletionRateLimiter,
        validate(deleteAccountSchema,"body"),
        userController.deleteAccount
    );


    export default router;
