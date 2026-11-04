import { useEffect, useRef } from "react";

import {
  IDLE_LIMIT_MS,
  readLastActivity,
  writeLastActivity,
} from "./idleActivity.js";

// Things the user does that count as activity. Background work (like notification polling) is not an event
// the user triggers, so it never counts.
const ACTIVITY_EVENTS = [
  "pointerdown",
  "mousemove",
  "keydown",
  "wheel",
  "scroll",
  "touchstart",
  "popstate", // browser back / forward
];

// How often the idle limit is checked
const CHECK_INTERVAL_MS = 30 * 1000;

// Saving to localStorage on every mouse move would be wasteful, so it is saved at most this often
const SAVE_THROTTLE_MS = 5 * 1000;

// Calls onIdle once the user has done nothing for IDLE_LIMIT_MS (any open tab's activity counts).
// Only watches while `enabled` is true, i.e. while someone is logged in.
export default function useIdleTimeout({ enabled, onIdle }) {
  // Keeps the newest onIdle without restarting the timers below whenever the parent re-renders
  const onIdleRef = useRef(onIdle);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (!enabled) return;

    // Kept in memory too, so the timeout still works when localStorage is blocked
    let lastActivityInThisTab = Date.now();
    let lastSavedAt = lastActivityInThisTab;

    // Opening or reloading the app counts as activity
    writeLastActivity(lastActivityInThisTab);

    // Notes that the user just did something.
    function recordActivity() {
      const now = Date.now();

      lastActivityInThisTab = now;

      if (now - lastSavedAt >= SAVE_THROTTLE_MS) {
        lastSavedAt = now;
        writeLastActivity(now);
      }
    }

    // Signs the user out if the newest activity (this tab or another one) is older than the limit.
    function checkIdle() {
      const lastActivity = Math.max(
        lastActivityInThisTab,
        readLastActivity() ?? 0
      );

      if (Date.now() - lastActivity > IDLE_LIMIT_MS) {
        onIdleRef.current();
      }
    }

    // After a laptop sleeps or a tab is in the background, timers are paused: check as soon as the user is back
    function handleReturn() {
      if (!document.hidden) {
        checkIdle();
      }
    }

    ACTIVITY_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, {
        passive: true,
        capture: true, // "scroll" does not bubble, so catch it on the way down
      })
    );
    document.addEventListener("visibilitychange", handleReturn);
    window.addEventListener("focus", handleReturn);

    const timerId = setInterval(checkIdle, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, recordActivity, { capture: true })
      );
      document.removeEventListener("visibilitychange", handleReturn);
      window.removeEventListener("focus", handleReturn);
      clearInterval(timerId);
    };
  }, [enabled]);
}
