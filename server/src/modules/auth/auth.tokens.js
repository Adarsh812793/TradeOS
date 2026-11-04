//File to create access and refresh tokens
import config from "../../config/env.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

//i.Function to create access token using JWT
export const createAccessToken = (user) => {
    return jwt.sign(
        {
            userId: user._id.toString(),
            role: "USER"
        },
        config.JWT_ACCESS_SECRET,
        {
            expiresIn: "15m"
        }
    );
};

//ii.Function to create refresh token using crpto
export const createRefreshToken = () => {
    return crypto.randomBytes(64).toString("hex");
};

//iii. Function to hash refresh token
export const hashRefreshToken = (refreshToken) => {
    return crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");
};

//ii. Function to create a family ID for refresh tokens
export const createTokenFamilyId = () => {
    return crypto.randomUUID();
};