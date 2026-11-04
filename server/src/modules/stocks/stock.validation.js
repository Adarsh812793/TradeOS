import Joi from "joi";
import { objectIdSchema } from "../../utils/validation.js";

export const stockIdParamSchema = Joi.object({
    id: objectIdSchema
});