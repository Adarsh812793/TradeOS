import express from "express";

import notificationController from "./notification.controller.js";
import protect from "../../middleware/auth.middleware.js";
import validate from "../../middleware/validate.middleware.js";
import { paginationSchema } from "../../utils/pagination.validation.js";
import { notificationIdParamSchema } from "./notification.validation.js";

const router = express.Router();

// Reads the user's notifications (newest first) from the Notification collection; returns { items, pagination }.
router.get(
    "/",
    protect,
    validate(paginationSchema, "query"),
    notificationController.getNotifications
);

// Counts the user's unread notifications; returns { count } (the frontend polls this every 60 seconds for the bell badge).
router.get(
    "/unread-count",
    protect,
    notificationController.getUnreadCount
);

// Sets isRead on every unread notification of the user in one update; returns { updatedCount }.
router.patch(
    "/read-all",
    protect,
    notificationController.markAllAsRead
);

// Sets isRead on one notification (only if it belongs to the user); returns the updated notification or 404.
router.patch(
    "/:id/read",
    protect,
    validate(notificationIdParamSchema, "params"),
    notificationController.markAsRead
);

export default router;
