//This file has generic panigation obejct that can be used by many modlues
//Adds page=1 limit=20 if no input is given by user
import Joi from "joi";

export const paginationSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
});