//Custom error class contains message,statusCode and errorCode to send meaningful error response when somthing goes wrong
class AppError extends Error {
    constructor(message, statusCode, errorCode = null) {
        super(message);

        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;