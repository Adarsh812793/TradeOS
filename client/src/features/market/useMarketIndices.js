import { useEffect, useState } from "react";

import { getMarketIndices } from "./market.api.js";

// How often the market strip asks for fresh index data (the server shares one FYERS call between everyone)
const POLL_INTERVAL_MS = 60_000;

// Loads NIFTY 50 and SENSEX for the top bar and keeps them up to date: once now, then every 60 seconds, but only while
// the tab is visible (and at once when the tab comes back). Background polling does not count as user activity.
// Returns { indices, status } where status is "loading", "ready" or "unavailable".
// If a request fails the old numbers are dropped (status "unavailable") instead of being left on screen as if current.
export default function useMarketIndices() {
  const [indices, setIndices] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    // Prevents state updates after the layout has been left
    let isMounted = true;

    // Asks the server for the indices and updates the strip (or empties it when nothing usable came back).
    async function loadIndices() {
      if (document.hidden) return; // nobody is looking at a hidden tab

      try {
        const response = await getMarketIndices();

        if (!isMounted) return;

        const items = response.indices ?? [];

        setIndices(items);
        setStatus(items.length > 0 ? "ready" : "unavailable");
      } catch {
        if (isMounted) {
          setIndices([]);
          setStatus("unavailable");
        }
      }
    }

    loadIndices();

    const timerId = setInterval(loadIndices, POLL_INTERVAL_MS);

    function handleVisibilityChange() {
      if (!document.hidden) {
        loadIndices();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { indices, status };
}
