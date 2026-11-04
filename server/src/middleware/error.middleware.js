//Generic and centralized err handling middleware
const errorHandler = (err, req, res, next) => {
    console.error(err);

    if (err.isOperational) { //Expected errors--1
        return res.status(err.statusCode).json({
            success: false,         //HTTP error code
            message: err.message,   //Err message for the clients
            errorCode: err.errorCode //Err message for programmers to understand (We use this in frontend)
        });
    }

    res.status(500).json({ //Not expected errors--2
        success: false,
        message: "Internal Server Error"
    });
};

export default errorHandler;