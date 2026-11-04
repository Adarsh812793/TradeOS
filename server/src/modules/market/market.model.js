//Schema for storing access token and refresh token recieved from fyers

import mongoose from "mongoose";

/* 1. FYERS Token Schema */
const fyersTokenSchema = new mongoose.Schema(
    {
        accessToken: {
            type: String,
            required: true
        },

        refreshToken: {
            type: String,
            required: true
        },

        // Track when the tokens were last saved.
        // This is not necessarily the token's expiry time.
        tokenUpdatedAt: {
            type: Date,
            default: Date.now,
            required: true
        },
        
        accessTokenExpiresAt: { //Expiry of token
            type: Date,
            required: true
        },
        connectionStatus: { //To determine whether access token is expired and FYERS needs re-authorisation
            type: String,
            enum: ["connected", "reauthorization_required"],
            default: "connected",
            required: true
        },

    },
    { timestamps: true }
);

/* 2. Export the FYERS Token Model */
const FyersToken = mongoose.model("FyersToken", fyersTokenSchema);

export default FyersToken;
