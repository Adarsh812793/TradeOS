
import { useCallback, useEffect, useState } from "react";
import { getTransactions } from "../transactions.api.js";

const PAGE_SIZE = 10;

export default function useTransactions() {
  // The page the user asked for. `pagination` below is what the server last answered with,
  // so if loading a page fails, the numbers on screen still match the rows on screen.
  const [page, setPage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);

  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Prevents state updates after the page has been left
    let isMounted = true;

    async function fetchTransactions() {
      try {
        setLoading(true);
        setError("");

        const response = await getTransactions({ page, limit: PAGE_SIZE });

        if (!isMounted) return;

        setTransactions(response.data.items);
        setPagination(response.data.pagination);
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load your transactions.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchTransactions();

    return () => {
      isMounted = false;
    };
  }, [page, retryKey]);

  const changePage = useCallback((nextPage) => {
    setPage(nextPage);
  }, []);

  // Re-runs the request for the current page
  const retry = useCallback(() => {
    setRetryKey((key) => key + 1);
  }, []);

  return {
    transactions,
    pagination,
    loading,
    error,
    changePage,
    retry,
  };
}
