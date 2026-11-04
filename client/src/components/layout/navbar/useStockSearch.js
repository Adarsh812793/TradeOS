import { useEffect, useState } from "react";
import stocksApi from "../../../features/stocks/stocks.api.js";

// Loads the stock list from the backend each time the search dropdown opens, so prices stay fresh.
// Already-loaded stocks stay visible while a refresh runs; `retry()` re-runs a failed load.
export default function useStockSearch(isOpen) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function fetchStocks() {
      try {
        setLoading(true);
        setError("");

        const response = await stocksApi.getAllStocks();

        if (isMounted) {
          setStocks(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load stocks.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStocks();

    return () => {
      isMounted = false;
    };
  }, [isOpen, refreshKey]);

  return {
    stocks,
    loading,
    error,
    retry: () => setRefreshKey((key) => key + 1),
  };
}
