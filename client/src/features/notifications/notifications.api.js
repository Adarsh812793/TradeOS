import api from "../../lib/api.js";

const NOTIFICATIONS_BASE_URL = "/api/notifications";

// Gets one page of the user's notifications, newest first
const getNotifications = ({ page = 1, limit = 20 } = {}) =>
  api.get(`${NOTIFICATIONS_BASE_URL}?page=${page}&limit=${limit}`);

// Gets only the unread count: a tiny request, which is why it is the one that gets polled
const getUnreadCount = () => api.get(`${NOTIFICATIONS_BASE_URL}/unread-count`);

// Marks one notification as read
const markAsRead = (notificationId) =>
  api.patch(`${NOTIFICATIONS_BASE_URL}/${notificationId}/read`);

// Marks every notification as read
const markAllAsRead = () => api.patch(`${NOTIFICATIONS_BASE_URL}/read-all`);

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
