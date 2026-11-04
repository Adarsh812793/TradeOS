import AppError from "../utils/AppError.js";
import ERROR_CODES from "../utils/errorCodes.js";

const notFound = (req, res, next) => {
    next(
        new AppError(
            `Route not found: ${req.method} ${req.originalUrl}`,
            404,
            ERROR_CODES.ROUTE_NOT_FOUND
        )
    );
};

export default notFound;