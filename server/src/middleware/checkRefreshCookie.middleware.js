
import AppError from "../utils/AppError.js";
import ERROR_CODES from "../utils/errorCodes.js";

const checkRefreshCookie = (req, res, next) => {
    const refreshToken = req.cookies?.refreshToken;

    // 1. Check whether refresh token cookie exists
    if (!refreshToken) {
        console.log("Refresh cookie missing — rejecting with 401");
        return next(
            new AppError("Refresh token missing. Please log in again.", 401,ERROR_CODES.REFRESH_TOKEN_MISSING)
        );
    }

    // 2. Cookie exists, continue to controller
    next();
};

export default checkRefreshCookie;


