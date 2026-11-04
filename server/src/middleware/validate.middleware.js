//Generic validation middleware using joi (validation schema object is created in respective module using joi package)

import AppError from "../utils/AppError.js";
import ERROR_CODES from "../utils/errorCodes.js";

//Generic function that takes schema and validates requets, now schema will be created in respective modules
//This function validates req.body ,req.params, and also req.query 
const validate = (schema, property = "body") => {
    return (req, res, next) => {

        const { error, value } = schema.validate(req[property], {
            abortEarly: false,  //Does not stop at first validation fail and collects every validation fail
            stripUnknown: true //Removes extra fields
        });

        if (error) {
            const message = error.details
                .map((detail) => detail.message)
                .join(", ");

            return next(new AppError(message, 400,ERROR_CODES.VALIDATION_ERROR));
        }

        if (property === "query") {
            // Express 5 makes req.query a read-only getter, so Object.assign onto it silently does nothing.
            // Define it as an own property on the request instead, so controllers receive the
            // validated values (Joi defaults applied, "2" converted to 2, unknown fields stripped).
            Object.defineProperty(req, "query", {
                value,
                writable: true,
                configurable: true,
                enumerable: true
            });
        } else {
            Object.assign(req[property], value);
        }

        next();
    };
};

export default validate;