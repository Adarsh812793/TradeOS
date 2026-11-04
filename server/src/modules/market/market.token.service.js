//Responssibility:Saves and retrieves tokens and also update the status for re-auth for FYERS if needed

import FyersToken from "./market.model.js";
import { getNextFyersExpiry } from "./market.tokens.utils.js";

/* 1. Save FYERS Tokens */
export async function saveFyersTokens(accessToken, refreshToken) {
    if (!accessToken || !refreshToken) {
        throw new Error("Both FYERS tokens are required.");
    }

    const savedTokens = await FyersToken.findOneAndUpdate(
        {},
        {
            $set: {
                accessToken,
                refreshToken,
                tokenUpdatedAt: new Date(),
                accessTokenExpiresAt: getNextFyersExpiry(), //Also saves expiry
            }
        },
        {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    );

    return savedTokens;
}

/* 2. Retrieve Saved FYERS Tokens */
export async function getSavedFyersTokens() {
    const savedTokens = await FyersToken.findOne({}).lean();

    if (!savedTokens) {
        return null;
    }

    return {
        accessToken: savedTokens.accessToken,
        refreshToken: savedTokens.refreshToken,
        tokenUpdatedAt: savedTokens.tokenUpdatedAt,
        accessTokenExpiresAt: savedTokens.accessTokenExpiresAt
    };
}

/* 3. Update FYERS Connection Status */
export async function updateFyersConnectionStatus(status) {
    const allowedStatuses = [
        "connected",
        "reauthorization_required"
    ];

    if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid FYERS connection status.");
    }

    const updatedTokens = await FyersToken.findOneAndUpdate(
        {},
        {
            $set: {
                connectionStatus: status
            }
        },
        {
            new: true,
            runValidators: true
        }
    );

    if (!updatedTokens) {
        throw new Error("FYERS token record not found.");
    }

    return updatedTokens.connectionStatus;
}

/* 4. Retrieve FYERS Connection Status */
export async function getFyersConnectionStatus() {
    const savedTokens = await FyersToken.findOne({})
        .select("connectionStatus")
        .lean();

    if (!savedTokens) {
        return "reauthorization_required";
    }

    return savedTokens.connectionStatus
        ?? "reauthorization_required";
}

