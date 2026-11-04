
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck } from "lucide-react";

import useClickOutside from "../hooks/useClickOutside.js";
import useNotifications from "../../../features/notifications/useNotifications.js";
import { formatRelativeTime } from "../../../utils/date.utils.js";
import "./Notifications.css";

// Colour of the dot in front of each notification, by type
const DOT_BY_TYPE = {
  ORDER_EXECUTED: "success",
  WELCOME: "neutral",
  LOW_BALANCE: "warning",
  PASSWORD_CHANGED: "info",
};

// Largest number shown inside the bell badge before it switches to "99+"
const MAX_BADGE_COUNT = 99;

// Navbar bell, its green unread-count badge and the notifications dropdown.
// All data and actions come from NotificationsProvider; this component only shows them.
export default function Notifications({ isOpen, onOpen, onClose }) {
  const navigate = useNavigate();
  const notificationsRef = useRef(null);

  const {
    unreadCount,
    items,
    pagination,
    listLoading,
    loadingMore,
    listError,
    actionError,
    requestList,
    loadMore,
    markRead,
    markAllRead,
    retryList,
  } = useNotifications();

  // Close the dropdown when clicking outside or pressing Escape.
  useClickOutside(notificationsRef, isOpen, onClose);

  const badgeText =
    unreadCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : unreadCount;

  // Opening the bell loads the latest list; closing it just hides the dropdown.
  function handleToggle() {
    if (isOpen) {
      onClose();
      return;
    }

    requestList();
    onOpen();
  }

  // Clicking a notification marks it read, closes the dropdown and opens the page it links to.
  function handleNotificationClick(notification) {
    markRead(notification._id);
    onClose();

    if (notification.link) {
      navigate(notification.link);
    }
  }

  return (
    <div className="notifications" ref={notificationsRef}>
      {/* Notification bell with the green unread-count badge */}
      <button
        type="button"
        className={`navbar__action-button ${
          isOpen ? "navbar__action-button--active" : ""
        }`}
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell size={19} strokeWidth={1.8} />

        {unreadCount > 0 && (
          // key={badgeText} restarts the small "pop" animation whenever the number changes
          <span
            className="notifications__badge"
            key={badgeText}
            aria-hidden="true"
          >
            {badgeText}
          </span>
        )}
      </button>

      {/* Notification dropdown */}
      {isOpen && (
        <section
          className="notifications__dropdown"
          aria-label="Notifications"
        >
          <header className="notifications__header">
            <div>
              <h2 className="notifications__title">
                Notifications
              </h2>

              <p className="notifications__subtitle">
                {unreadCount > 0
                  ? `${unreadCount} unread ${
                      unreadCount === 1 ? "notification" : "notifications"
                    }`
                  : "You're all caught up"}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notifications__mark-all"
                onClick={markAllRead}
              >
                <CheckCheck size={15} />
                <span>Mark all read</span>
              </button>
            )}
          </header>

          {/* A failed "mark as read" is undone on screen and explained here */}
          {actionError && (
            <p className="notifications__banner" role="alert">
              {actionError}
            </p>
          )}

          {/* Notification list */}
          <div className="notifications__list">
            {listLoading && items.length === 0 && (
              <p className="notifications__status" role="status">
                Loading notifications...
              </p>
            )}

            {listError && items.length === 0 && !listLoading && (
              <div className="notifications__status notifications__status--error">
                <p>{listError}</p>
                <button
                  type="button"
                  className="notifications__retry"
                  onClick={retryList}
                >
                  Try again
                </button>
              </div>
            )}

            {items.map((notification) => (
              <div
                key={notification._id}
                className={`notifications__item ${
                  notification.isRead
                    ? "notifications__item--read"
                    : "notifications__item--unread"
                }`}
              >
                <button
                  type="button"
                  className="notifications__item-main"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span
                    className={`notifications__dot notifications__dot--${
                      DOT_BY_TYPE[notification.type] ?? "neutral"
                    }`}
                    aria-hidden="true"
                  />

                  <span className="notifications__content">
                    <span className="notifications__item-heading">
                      <span className="notifications__item-title">
                        {notification.title}
                      </span>

                      {!notification.isRead && (
                        <span className="notifications__unread-badge">
                          New
                        </span>
                      )}
                    </span>

                    <span className="notifications__message">
                      {notification.message}
                    </span>

                    <span className="notifications__time">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </span>
                </button>

                {/* Mark one as read without leaving the page */}
                {!notification.isRead && (
                  <button
                    type="button"
                    className="notifications__item-read"
                    onClick={() => markRead(notification._id)}
                    aria-label={`Mark "${notification.title}" as read`}
                    title="Mark as read"
                  >
                    <Check size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}

            {!listLoading && !listError && items.length === 0 && (
              <div className="notifications__empty">
                <Bell size={25} strokeWidth={1.5} />
                <p>No notifications yet</p>
                <span>
                  Updates about your account and orders will appear here.
                </span>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <footer className="notifications__footer">
              <span>
                Showing {items.length}
                {pagination ? ` of ${pagination.totalItems}` : ""}
              </span>

              {pagination?.hasNextPage && (
                <button
                  type="button"
                  className="notifications__load-more"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              )}
            </footer>
          )}
        </section>
      )}
    </div>
  );
}
