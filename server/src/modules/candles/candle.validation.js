import Joi from "joi";

// ?range=1D|1W|1M|3M|1Y|ALL (the time ranges of the stock page's chart); 1D when omitted
export const candleQuerySchema = Joi.object({
    range: Joi.string().valid("1D", "1W", "1M", "3M", "1Y", "ALL").default("1D")
});
