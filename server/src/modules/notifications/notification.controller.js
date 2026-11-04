import notificationService from "./notification.service.js";
import asyncWrap from "../../utils/asyncWrap.js";

// i. Get one page of the logged-in user's notifications
const getNotifications = asyncWrap(async (req, res) => {
    const userId = req.user.userId;
    const { page, limit } = req.query;

    const data = await notificationService.getUserNotifications(userId, page, limit);

    res.status(200).json({
        success: true,
        message: "Notifications retrieved successfully",
        data
    });
});

// ii. Get the unread count (the endpoint the frontend polls)
const getUnreadCount = asyncWrap(async (req, res) => {
    const data = await notificationService.getUnreadCount(req.user.userId);

    res.status(200).json({
        success: true,
        message: "Unread count retrieved successfully",
        data
    });
});

// iii. Mark one notification as read
const markAsRead = asyncWrap(async (req, res) => {
    const data = await notificationService.markAsRead(req.user.userId, req.params.id);

    res.status(200).json({
        success: true,
        message: "Notification marked as read",
        data
    });
});

// iv. Mark all notifications as read
const markAllAsRead = asyncWrap(async (req, res) => {
    const data = await notificationService.markAllAsRead(req.user.userId);

    res.status(200).json({
        success: true,
        message: "All notifications marked as read",
        data
    });
});

export default {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
};
