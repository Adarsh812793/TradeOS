
import { useCallback, useEffect, useState } from "react";
import { getPortfolio } from "../portfolio.api.js";
import useVisiblePolling from "../../../hooks/useVisiblePolling.js";

export default function usePortfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // True while a manual refresh is in flight (the first load uses `loading`)
  const [refreshing, setRefreshing] = useState(false);

  // Changing this number re-runs the effect below, which reloads the data
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Prevents state updates after the page has been left
    let isMounted = true;

    async function fetchPortfolio() {
      try {
        const response = await getPortfolio();

        if (!isMounted) return;

        setError("");
        setPortfolio(response.data);
        setLastUpdated(new Date());
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load your portfolio.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    fetchPortfolio();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Prices move, so reload quietly every 30 s while the tab is visible: no spinner, and a failed reload keeps the
  // numbers on screen (only the Refresh button reports errors)
  useVisiblePolling(async () => {
    try {
      const response = await getPortfolio();
      setPortfolio(response.data);
      setLastUpdated(new Date());
    } catch {
      /* keep showing the figures we have */
    }
  });

  // Reloads the data without blanking the page (loading only applies to the first load)
  const refresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
  }, []);

  return {
    portfolio,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
  };
}
