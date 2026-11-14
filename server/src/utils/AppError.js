//Custom error class contains message,statusCode and errorCode to send meaningful error response when somthing goes wrong
class AppError extends Error {
    // `details` is optional extra information for the browser (for example { retryAfterSeconds: 42 } for a countdown)
    constructor(message, statusCode, errorCode = null, details = null) {
        super(message);

        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;