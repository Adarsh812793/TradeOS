import Joi from "joi";
import { nameSchema, passwordSchema } from "../../utils/validation.js";

//Register Schema
export const registerSchema = Joi.object({
    name: nameSchema,

    email: Joi.string()
        .trim()
        .lowercase()
        .email()
        .required()
        .messages({
            "string.empty": "Email is required",
            "string.email": "Please provide a valid email",
            "any.required": "Email is required"
        }),

    password: passwordSchema
});

//Resend-code Schema (POST /api/auth/register/resend): the email of the sign-up that is waiting for its code
export const resendCodeSchema = Joi.object({
    email: Joi.string()
        .trim()
        .lowercase()
        .email()
        .required()
        .messages({
            "string.empty": "Email is required",
            "string.email": "Please provide a valid email",
            "any.required": "Email is required"
        })
});

//Login Schema
export const loginSchema = Joi.object({
    email: Joi.string()
        .trim()
        .lowercase()
        .email()
        .required()
        .messages({
            "string.empty": "Email is required",
            "string.email": "Please provide a valid email",
            "any.required": "Email is required"
        }),

    password: Joi.string()
        .required()
        .messages({
            "string.empty": "Password is required",
            "any.required": "Password is required"
        })
});

//Change password Schema (PATCH /api/auth/password)
export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string()
        .required()
        .messages({
            "string.empty": "Current password is required",
            "any.required": "Current password is required"
        }),

    newPassword: passwordSchema.messages({
        "string.empty": "New password is required",
        "string.min": "New password must be at least 8 characters",
        "string.max": "New password cannot exceed 128 characters",
        "any.required": "New password is required"
    })
});