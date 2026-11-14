import mongoose from "mongoose";

// A sign-up that is waiting for its email code. NO real account exists yet: no User, no Wallet. Only when the right code
// arrives does the service create those (in one transaction) and delete this record. Until then everything the person
// typed is kept here, ready to become the account:
//   passwordHash   already hashed with argon2 at the first step, so the password is never stored as typed, not even here
//   codeHash       the HMAC of the 6-digit code (see otp.utils.js), never the code itself
// There is at most ONE pending sign-up per email (unique index): starting again replaces the old one, so an attacker
// cannot pile up pending records for an address, and the person always has one live code.
const pendingRegistrationSchema = new mongoose.Schema(
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

        codeHash: {
            type: String,
            required: true
        },

        // When the current code stops working (a few minutes after it was sent)
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

        // How many times the code was sent again, and when the last email went out (for the resend limits)
        resendCount: {
            type: Number,
            default: 0,
            min: 0
        },

        lastSentAt: {
            type: Date,
            required: true
        },

        // The whole pending sign-up is deleted by MongoDB at this time, so abandoned ones clean themselves up
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

const PendingRegistration = mongoose.model("PendingRegistration", pendingRegistrationSchema);

export default PendingRegistration;
