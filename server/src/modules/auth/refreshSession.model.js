//To store thr refresh token in hashed form in db
import mongoose from "mongoose";

const refreshSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        tokenHash: {
            type: String,
            required: true,
            unique: true
        },

        familyId: {
        type: String,
        required: true,
        index: true
        },

        expiresAt: {
            type: Date,
            required: true,
            index:{
                expires:0 //Delete the expired document the moment time is reached
            }
        },
        
        revokedAt: {
        type: Date,
        default: null
        },

        // Set only when the token was replaced by a newer one during a normal refresh (not on logout,
        // password change or theft revoke). It powers the short grace period after a rotation.
        rotatedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const RefreshSession = mongoose.model(
    "RefreshSession",
    refreshSessionSchema
);

export default RefreshSession;