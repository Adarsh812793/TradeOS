import express from "express";
import transactionController from "./transaction.controller.js";
import protect from "../../middleware/auth.middleware.js";

import { paginationSchema } from "../../utils/pagination.validation.js";
import validate from "../../middleware/validate.middleware.js";

const router = express.Router();

router.get(
    "/",
    protect,
    validate(paginationSchema,"query"),
    transactionController.getUserTransactions
);

export default router;