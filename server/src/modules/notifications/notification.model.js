import mongoose from "mongoose";

import { NOTIFICATION_TYPES, NOTIFICATION_TTL_DAYS } from "./notification.constants.js";

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    type: {
        type: String,
        enum: Object.values(NOTIFICATION_TYPES),
        required: true
    },

    // Finished text shown to the user (wording is decided when the notification is created)
    title: {
        type: String,
        required: true,
        trim: true
    },

    message: {
        type: String,
        required: true,
        trim: true
    },

    // In-app path to open when the notification is clicked, e.g. "/orders"
    link: {
        type: String,
        default: null
    },

    // Extra ids for future use (not shown to the user)
    metadata: {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
        stockId: { type: mongoose.Schema.Types.ObjectId, ref: "Stock" }
    },

    isRead: {
        type: Boolean,
        default: false
    },

    readAt: {
        type: Date,
        default: null
    },

    // TTL index: MongoDB removes the document itself NOTIFICATION_TTL_DAYS after this date
    // (its background cleanup runs about once a minute, so deletion is not to-the-second exact)
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * NOTIFICATION_TTL_DAYS
    }
});

// List: a user's notifications, newest first
notificationSchema.index({ userId: 1, createdAt: -1 });

// Unread badge: count a user's unread notifications quickly
notificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.model(
    "Notification",
    notificationSchema
);

export default Notification;
