import Joi from "joi";
import { objectIdSchema } from "../../utils/validation.js";

// :id in PATCH /api/notifications/:id/read
export const notificationIdParamSchema = Joi.object({
    id: objectIdSchema
});
