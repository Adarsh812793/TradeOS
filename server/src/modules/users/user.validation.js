import Joi from "joi";
import { nameSchema } from "../../utils/validation.js";

//Body of PATCH /api/users/me. Only the name can be edited for now (any other field is stripped by validate())
export const updateProfileSchema = Joi.object({
    name: nameSchema
});

//Body of DELETE /api/users/me. The password re-confirms who is asking before everything is erased
export const deleteAccountSchema = Joi.object({
    password: Joi.string()
        .required()
        .messages({
            "string.empty": "Password is required",
            "any.required": "Password is required"
        })
});
