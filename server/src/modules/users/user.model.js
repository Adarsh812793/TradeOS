import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        passwordHash: {
            type: String,
            required: true
        },

        //True once the person proved they own this email by entering the code we emailed (sign-up by email code sets it).
        //Accounts created before this field existed have no value; they were made by the owner and are trusted as verified.
        emailVerified: {
            type: Boolean,
            default: false
        },

        emailVerifiedAt: {
            type: Date,
            default: null
        },

        //Profile photo lives on Cloudinary; only its link and name are stored here
        avatar: {
            url: { type: String, default: null },
            publicId: { type: String, default: null }
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);

export default User;