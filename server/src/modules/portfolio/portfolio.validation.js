import Joi from "joi";

// Query of GET /api/portfolio/history: how far back the account value chart goes (there is no 1D: history has one
// point per trading day)
export const historyQuerySchema = Joi.object({
    range: Joi.string()
        .valid("1W", "1M", "3M", "1Y", "ALL")
        .default("1M")
});
