# Notifications (version 1)

In-app notifications behind the navbar bell. Version 1 only has notifications that come from the user's own actions; market alerts (price alerts, watchlist movers) wait for a reliable live-price source.

## Types (version 1)

| Type | Created when | Link |
|---|---|---|
| `ORDER_EXECUTED` | A buy or sell order is executed | `/orders` |
| `WELCOME` | The account is registered | `/stocks` |
| `LOW_BALANCE` | A buy moves the wallet from >= ₹5,000 to < ₹5,000 (only when it crosses, not on every buy) | `/portfolio` |
| `PASSWORD_CHANGED` | Change password succeeds | `/account` |

Notifications are deleted automatically 30 days after creation (MongoDB TTL index on `createdAt`; the cleanup runs about once a minute).

## Design

- One entry point: `notificationService.createNotification(userId, content, { session })`. Every feature calls it; wording lives in `notification.templates.js`, constants (types, threshold, TTL) in `notification.constants.js`.
- Created inside the same MongoDB transaction as the action (order, registration, password change), so a notification never exists for something that rolled back.
- Delete account also deletes the user's notifications.
- The frontend learns about new notifications by **polling**: every 60 s (only while the tab is visible) it calls `GET /api/notifications/unread-count`. The list is loaded when the dropdown opens, and refreshed right after the user places an order. WebSockets can replace polling when live prices arrive; the REST endpoints stay.

## Endpoints (all protected)

- `GET /api/notifications?page&limit`: newest first, `{ items, pagination }`
- `GET /api/notifications/unread-count`: `{ count }`
- `PATCH /api/notifications/read-all`: `{ updatedCount }`
- `PATCH /api/notifications/:id/read`: the updated notification, 404 `NOTIFICATION_NOT_FOUND` if it is not the user's

## Checklist

Backend
- [x] Model with TTL + list / unread indexes
- [x] Service, controller, routes, validation, error code
- [x] Order (buy / sell / low balance), registration and password-change hooks, in the same transaction
- [x] Delete account removes notifications
- [x] Integration tests (`server/tests/notifications.integration.test.js`)

Frontend
- [x] `notifications.api.js`
- [x] `NotificationsProvider` + `useNotifications` (60 s polling, visibility-aware)
- [x] Wire `Notifications.jsx` to the provider (mark one / all read, click to open link)
- [x] Green unread-count badge on the bell (`99+` cap)
- [x] `formatRelativeTime` in `utils/date.utils.js`
- [x] Refresh after a buy / sell and after a password change
- [x] Mobile sheet, loading / error / empty states, "Load more"
- [x] Check by hand in the browser (desktop + phone width)
