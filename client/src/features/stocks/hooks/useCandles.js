import { useEffect, useRef, useState } from "react";

import stocksApi from "../stocks.api.js";
import useVisiblePolling from "../../../hooks/useVisiblePolling.js";

// Loads the chart candles of one stock for one range and keeps them fresh.
//   - Loads again when the stock or the range changes; an answer that arrives after the user has moved on is ignored.
//   - While a new range loads, the previous candles stay available (`candles` keeps its own `range`), so the chart
//     does not flash empty; `loading` says a request is running.
//   - Refreshes quietly every 30 s while the tab is visible; a failed refresh keeps the candles it has.
// Returns { data: { range, interval, candles } | null, loading, error, retry }.
export default function useCandles(stockId, range) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // What the page wants right now, so a slow answer for an older stock or range can be recognised and dropped
  const wantedRef = useRef({ stockId, range });

  useEffect(() => {
    wantedRef.current = { stockId, range };
  });

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const response = await stocksApi.getCandles(stockId, range);

        if (isCurrent) setData(response.data);
      } catch (err) {
        if (isCurrent) setError(err.message || "Failed to load the chart.");
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    load();

    return () => {
      isCurrent = false;
    };
  }, [stockId, range, refreshKey]);

  // The old stock's candles must never show under a new stock
  const [dataStockId, setDataStockId] = useState(stockId);

  if (dataStockId !== stockId) {
    setDataStockId(stockId);
    setData(null);
  }

  // Quiet refresh: the live candle keeps moving; errors are ignored, the old candles stay
  useVisiblePolling(async () => {
    const asked = wantedRef.current;

    try {
      const response = await stocksApi.getCandles(asked.stockId, asked.range);

      if (
        wantedRef.current.stockId === asked.stockId &&
        wantedRef.current.range === asked.range
      ) {
        setData(response.data);
      }
    } catch {
      /* keep showing the candles we have */
    }
  });

  return {
    data,
    loading,
    error,
    retry: () => setRefreshKey((key) => key + 1),
  };
}
