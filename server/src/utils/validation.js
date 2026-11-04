//Shared Joi rules used by more than one module
// objectIdSchema -> GET api/stocks/:id, DELETE api/watchlist/:stockId
// nameSchema     -> signup (auth module) and profile edit (users module)
// passwordSchema -> signup and change password (auth module)

import Joi from "joi";

export const objectIdSchema = Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
        "string.empty": "ID is required",
        "string.length": "Invalid ID format",
        "string.hex": "Invalid ID format",
        "any.required": "ID is required"
    });

//Display name rule: trimmed, 2-50 characters
export const nameSchema = Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
        "string.empty": "Name is required",
        "string.min": "Name must be at least 2 characters",
        "string.max": "Name cannot exceed 50 characters",
        "any.required": "Name is required"
    });

//Password rule: 8-128 characters (not trimmed, spaces are allowed inside a password)
export const passwordSchema = Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
        "string.empty": "Password is required",
        "string.min": "Password must be at least 8 characters",
        "string.max": "Password cannot exceed 128 characters",
        "any.required": "Password is required"
    });
