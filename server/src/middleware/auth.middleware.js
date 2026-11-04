//Generic auth for any route
import config from "../config/env.js";
import jwt from "jsonwebtoken";
import ERROR_CODES from "../utils/errorCodes.js";

const protect = (req, res, next) => {

    // ==========================================
    // 1. Get Authorization header
    // ==========================================

    const authHeader = req.headers.authorization;


    // If Authorization header doesn't exist
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Authentication required,Pass auth credencials"
        });
    }


    // ==========================================
    // 2. Check Bearer format
    // ==========================================

    // Expected:
    //
    // Authorization: Bearer eyJhbGciOi...
    //

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({
            success: false,
            message: "Invalid authorization format"
        });
    }


    // ==========================================
    // 3. Extract JWT
    // ==========================================

    const token = parts[1]; //access token recieved from user


    // ==========================================
    // 4. Verify JWT
    // ==========================================

    try {
        const decoded = jwt.verify(
            token,
            config.JWT_ACCESS_SECRET
        );


        // ==========================================
        // 5. Attach user information to request
        // ==========================================

        //decoded will contain all user info like id and role if verifies
        req.user = decoded;


        // ==========================================
        // 6. Continue to next middleware/controller
        // ==========================================

        next();

    } catch (error) {

        // errorCode lets the frontend tell "token expired, renew it and retry" (ACCESS_TOKEN_EXPIRED)
        // apart from other 401s such as a wrong password
        return res.status(401).json({
            success: false,
            message: "Invalid or expired access token",
            errorCode: error.name === "TokenExpiredError"
                ? ERROR_CODES.ACCESS_TOKEN_EXPIRED
                : ERROR_CODES.ACCESS_TOKEN_INVALID
        });
    }
};

export default protect;