// If all goes well env variables will be exported from this file , if any env variable not configured err will occur
//Import this file instead of using process.env

//Make sure to configure correct .env file we have two of them ,the other one is for testing purpose.
import dotenv from "dotenv";

const envFile = process.env.NODE_ENV === "test"
    ? ".env.test"
    : ".env";

dotenv.config({ path: envFile });

const requiredEnvVariables = [
    "MONGODB_URI",
    "JWT_ACCESS_SECRET",
    "FRONTEND_URL"
];

for (const variable of requiredEnvVariables) {
    if (!process.env[variable]) {
        throw new Error(
            `Missing required environment variable: ${variable}`
        );
    }
}

export default {
    PORT: process.env.PORT || 8080,
    NODE_ENV: process.env.NODE_ENV || "development",
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL,
    INDIAN_API_KEY: process.env.INDIAN_API_KEY,
    FYERS_APP_ID: process.env.FYERS_APP_ID,
    FYERS_APP_SECRET: process.env.FYERS_APP_SECRET,
    FYERS_REDIRECT_URI: process.env.FYERS_REDIRECT_URI,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};