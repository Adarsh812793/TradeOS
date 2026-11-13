import { useEffect, useRef, useState } from "react";

import { getPortfolioHistory } from "../portfolio.api.js";
import useVisiblePolling from "../../../hooks/useVisiblePolling.js";

// Loads the account value history for one range and keeps it fresh.
//   - Loads again when the range changes; an answer that arrives after the user has moved on is ignored.
//   - While a new range loads, the previous history stays available (it carries its own `range`), so the chart
//     does not flash empty; `loading` says a request is running.
//   - Refreshes quietly every 30 s while the tab is visible (today's point follows the prices); a failed refresh
//     keeps the history it has.
// Returns { data: { range, currency, firstTradeAt, points, summary } | null, loading, error, retry }.
export default function usePortfolioHistory(range) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // The range the page wants right now, so a slow answer for an older range can be recognised and dropped
  const wantedRangeRef = useRef(range);

  useEffect(() => {
    wantedRangeRef.current = range;
  });

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const response = await getPortfolioHistory(range);

        if (isCurrent) setData(response.data);
      } catch (err) {
        if (isCurrent) setError(err.message || "Failed to load your account value.");
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    load();

    return () => {
      isCurrent = false;
    };
  }, [range, refreshKey]);

  // Quiet refresh: today's point keeps moving; errors are ignored, the old history stays
  useVisiblePolling(async () => {
    const asked = wantedRangeRef.current;

    try {
      const response = await getPortfolioHistory(asked);

      if (wantedRangeRef.current === asked) setData(response.data);
    } catch {
      /* keep showing the history we have */
    }
  });

  return {
    data,
    loading,
    error,
    retry: () => setRefreshKey((key) => key + 1),
  };
}
