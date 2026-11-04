//Validation schema for orders
import Joi from "joi";

//Schema for buying and selling is same
export const OrderSchema = Joi.object({
    stockId: Joi.string()
        .required()
        .messages({
            "string.empty": "Stock ID is required",
            "any.required": "Stock ID is required"
        }),

    quantity: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            "number.base": "Quantity must be a number",
            "number.integer": "Quantity must be an integer",
            "number.positive": "Quantity must be greater than 0",
            "any.required": "Quantity is required"
        })
});

