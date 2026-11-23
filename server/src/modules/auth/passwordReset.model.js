import mongoose from "mongoose";

// A forgot-password request that is waiting for its email code. It exists ONLY for an email that has an account (the
// service never creates one for an unknown email, and answers the same either way so nobody can use the page to find out
// who has an account). The password is NOT stored here: the new one arrives together with the right code.
//   codeHash   the HMAC of the 6-digit code (see otp.utils.js, purpose RESET_PURPOSE), never the code itself
// At most ONE per email (unique index): asking again replaces the code, and the cooldown and the resend cap carry over.
const passwordResetSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true // the delete-account code removes a user's reset record by this
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        codeHash: {
            type: String,
            required: true
        },

        // When the current code stops working
        codeExpiresAt: {
            type: Date,
            required: true
        },

        // Wrong guesses made against the CURRENT code. A new code starts again at 0.
        attempts: {
            type: Number,
            default: 0,
            min: 0
        },

        // How many times a new code was sent, and when the last email went out (for the resend limits)
        resendCount: {
            type: Number,
            default: 0,
            min: 0
        },

        lastSentAt: {
            type: Date,
            required: true
        },

        // The whole request is deleted by MongoDB at this time, so abandoned ones clean themselves up
        expiresAt: {
            type: Date,
            required: true,
            index: {
                expires: 0 // delete the document the moment this time is reached
            }
        }
    },
    {
        timestamps: true
    }
);

const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);

export default PasswordReset;
