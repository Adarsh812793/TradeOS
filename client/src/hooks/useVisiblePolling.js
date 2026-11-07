import { useEffect, useRef } from "react";

// How often pages that show prices ask the server for fresh ones. Prices change every 15 s on the server, and 30 s
// keeps the load low (each request is one small read).
export const PRICE_REFRESH_MS = 30_000;

// Runs `task` again and again while the browser tab is visible, and straight away when the tab comes back.
//   - It does not run once at the start: the page loads its own first data.
//   - It never runs two copies at once: if the last run has not finished, the tick is skipped.
//   - It always calls the LATEST `task`, so the task may use current state without restarting the timer.
// Polling makes no keyboard or mouse events, so it does not count as activity for the idle timeout.
// A task should handle its own errors (a failed refresh should simply keep the old data on screen).
export default function useVisiblePolling(task, intervalMs = PRICE_REFRESH_MS) {
  const taskRef = useRef(task);

  useEffect(() => {
    taskRef.current = task;
  });

  useEffect(() => {
    let isRunning = false;

    async function run() {
      if (document.hidden || isRunning) return;

      isRunning = true;
      try {
        await taskRef.current();
      } finally {
        isRunning = false;
      }
    }

    const timerId = setInterval(run, intervalMs);

    document.addEventListener("visibilitychange", run);

    return () => {
      clearInterval(timerId);
      document.removeEventListener("visibilitychange", run);
    };
  }, [intervalMs]);
}
