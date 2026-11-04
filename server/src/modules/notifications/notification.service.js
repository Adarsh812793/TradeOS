import Notification from "./notification.model.js";

import AppError from "../../utils/AppError.js";
import ERROR_CODES from "../../utils/errorCodes.js";

// I. The single entry point every feature uses to create a notification.
// Pass { session } to save it inside the caller's transaction (saved together with the action, or not at all).
const createNotification = async (userId, content, { session } = {}) => {
    const [notification] = await Notification.create(
        [{ userId, ...content }],
        { session }
    );

    return notification;
};

// II. Gets one page of the user's notifications, newest first
const getUserNotifications = async (userId, page, limit) => {

    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1, _id: -1 }) // _id breaks ties between notifications created in the same millisecond
        .skip(skip)
        .limit(limit);

    const totalItems = await Notification.countDocuments({ userId });
    const totalPages = Math.ceil(totalItems / limit);

    return {
        items: notifications,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        }
    };
};

// III. Counts unread notifications (cheap, because the frontend asks for it every 60 seconds)
const getUnreadCount = async (userId) => {
    const count = await Notification.countDocuments({
        userId,
        isRead: false
    });

    return { count };
};

// IV. Marks one notification as read (the filter includes userId, so nobody can touch another user's)
const markAsRead = async (userId, notificationId) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { $set: { isRead: true, readAt: new Date() } },
        { returnDocument: "after" }
    );

    if (!notification) {
        throw new AppError("Notification not found", 404, ERROR_CODES.NOTIFICATION_NOT_FOUND);
    }

    return notification;
};

// V. Marks every unread notification of the user as read in one database call
const markAllAsRead = async (userId) => {
    const result = await Notification.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
    );

    return { updatedCount: result.modifiedCount };
};

export default {
    createNotification,
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
};
