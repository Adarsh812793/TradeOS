import Joi from "joi";
import { objectIdSchema } from "../../utils/validation.js";

export const addWatchlistSchema = Joi.object({
    stockId: Joi.string()
        .required()
        .messages({
            "string.empty": "Stock ID is required",
            "any.required": "Stock ID is required"
        })
});

export const stockIdParamSchema = Joi.object({
    stockId: objectIdSchema
});