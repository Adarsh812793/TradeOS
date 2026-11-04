import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import NotificationsContext from "./notificationsContext.js";
import notificationsApi from "./notifications.api.js";

// How often the browser asks the server "how many unread notifications do I have?"
const POLL_INTERVAL_MS = 60_000;

const PAGE_SIZE = 20;

// POLLING IN ONE PICTURE
// The server cannot "push" a message to the browser (that would need WebSockets), so the browser asks again and
// again instead: every 60 seconds it calls GET /api/notifications/unread-count, a tiny request that returns one
// number. If the number changed, the bell badge updates. That repeated asking is called polling.
// Two details keep it cheap: it pauses while the tab is hidden, and it checks again the moment the tab comes back.
// Besides polling, refresh() lets the app ask right away, e.g. just after the user places an order.
export default function NotificationsProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  // The list shown in the dropdown, plus the pagination info of the last page loaded
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState("");

  // Shown when marking as read fails (the change is undone and this explains why)
  const [actionError, setActionError] = useState("");

  // Bumping refreshKey restarts the polling effect, which asks for the unread count immediately
  const [refreshKey, setRefreshKey] = useState(0);

  // The list is only loaded once the user has opened the dropdown; after that polling keeps it fresh.
  // Bumping listKey makes the list effect reload page 1.
  const [listEnabled, setListEnabled] = useState(false);
  const [listKey, setListKey] = useState(0);
  const listEnabledRef = useRef(false); // lets the polling timer read the latest value without restarting

  // THE POLLING LOOP: asks for the unread count now, then every 60 seconds, until the app layout is left.
  useEffect(() => {
    // Prevents state updates after the layout has been left
    let isMounted = true;

    // Asks the server for the unread count and, if the list was opened before, also reloads it.
    async function fetchUnreadCount() {
      // Nobody is looking at a hidden tab, so skip the request
      if (document.hidden) return;

      try {
        const response = await notificationsApi.getUnreadCount();

        if (isMounted) {
          setUnreadCount(response.data.count);

          if (listEnabledRef.current) {
            setListKey((key) => key + 1);
          }
        }
      } catch {
        // Polling is background work: keep the last known count and simply try again at the next tick
      }
    }

    // Runs once immediately, so the badge is right as soon as the app loads
    fetchUnreadCount();

    // Then repeats on a timer
    const timerId = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);

    // When the user returns to this tab, do not wait for the next tick
    function handleVisibilityChange() {
      if (!document.hidden) {
        fetchUnreadCount();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup: stop the timer and the listener (otherwise polling would continue after logout)
    return () => {
      isMounted = false;
      clearInterval(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshKey]);

  // THE LIST LOADER: loads page 1 of the notifications whenever the dropdown has been opened or listKey is bumped.
  useEffect(() => {
    if (!listEnabled) return;

    let isMounted = true;

    // Fetches the newest notifications and replaces the list with them.
    async function fetchFirstPage() {
      try {
        setListError("");

        const response = await notificationsApi.getNotifications({
          page: 1,
          limit: PAGE_SIZE,
        });

        if (isMounted) {
          setItems(response.data.items);
          setPagination(response.data.pagination);
        }
      } catch (err) {
        if (isMounted) {
          setListError(err.message || "Unable to load notifications.");
        }
      } finally {
        if (isMounted) {
          setListLoading(false);
        }
      }
    }

    fetchFirstPage();

    return () => {
      isMounted = false;
    };
  }, [listEnabled, listKey]);

  // Called when the dropdown opens: shows the spinner only if there is nothing to show yet, then (re)loads the list.
  const requestList = useCallback(() => {
    listEnabledRef.current = true;
    setListEnabled(true);
    setListLoading(true);
    setListKey((key) => key + 1);
  }, []);

  // Appends the next page of older notifications to the list ("Load more" button).
  const loadMore = useCallback(async () => {
    if (!pagination?.hasNextPage || loadingMore) return;

    setLoadingMore(true);

    try {
      const response = await notificationsApi.getNotifications({
        page: pagination.page + 1,
        limit: PAGE_SIZE,
      });

      // New notifications may have shifted the pages, so skip any that are already in the list
      setItems((current) => {
        const knownIds = new Set(current.map((item) => item._id));
        const older = response.data.items.filter(
          (item) => !knownIds.has(item._id)
        );

        return [...current, ...older];
      });
      setPagination(response.data.pagination);
    } catch (err) {
      setActionError(err.message || "Unable to load more notifications.");
    } finally {
      setLoadingMore(false);
    }
  }, [pagination, loadingMore]);

  // Marks one notification as read: updates the screen first (feels instant), then tells the server, undoing it on failure.
  const markRead = useCallback(
    async (notificationId) => {
      const target = items.find((item) => item._id === notificationId);

      if (!target || target.isRead) return;

      setActionError("");
      setItems((current) =>
        current.map((item) =>
          item._id === notificationId ? { ...item, isRead: true } : item
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));

      try {
        await notificationsApi.markAsRead(notificationId);
      } catch (err) {
        // Undo the optimistic change
        setItems((current) =>
          current.map((item) =>
            item._id === notificationId ? { ...item, isRead: false } : item
          )
        );
        setUnreadCount((count) => count + 1);
        setActionError(err.message || "Unable to mark as read.");
      }
    },
    [items]
  );

  // Marks every notification as read: updates the screen first, then tells the server, undoing it on failure.
  const markAllRead = useCallback(async () => {
    const previousItems = items;
    const previousCount = unreadCount;

    setActionError("");
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);

    try {
      await notificationsApi.markAllAsRead();
    } catch (err) {
      setItems(previousItems);
      setUnreadCount(previousCount);
      setActionError(err.message || "Unable to mark all as read.");
    }
  }, [items, unreadCount]);

  // Asks the server for the latest count right now instead of waiting for the next 60-second tick.
  // Call it after something that creates a notification (placing an order, changing the password).
  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  // Retries a failed list load (the "Try again" button).
  const retryList = useCallback(() => {
    setListLoading(true);
    setListKey((key) => key + 1);
  }, []);

  const value = useMemo(
    () => ({
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
      refresh,
      retryList,
    }),
    [
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
      refresh,
      retryList,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
