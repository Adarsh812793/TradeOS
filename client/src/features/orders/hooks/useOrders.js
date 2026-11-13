
import { useEffect, useState } from "react";
import { getOrders } from "../orders.api.js";

const DEFAULT_LIMIT = 8;

export default function useOrders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Changing this number re-runs the effect below, which reloads the current page (the Try again button)
  const [refreshKey, setRefreshKey] = useState(0);

  const { page, limit } = pagination;

  useEffect(() => {
    let isMounted = true;

    async function fetchOrders() {
      try {
        setLoading(true);
        setError("");

        const response = await getOrders({
          page,
          limit,
        });



    const result = response.data;

    if (isMounted) {
    setOrders(result.items);

    setPagination({
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalItems: result.pagination.totalItems,
        totalPages: result.pagination.totalPages,
        hasNextPage: result.pagination.hasNextPage,
        hasPreviousPage: result.pagination.hasPreviousPage,
    });
    }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load your orders.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, [page, limit, refreshKey]);

  function changePage(nextPage) {
    setPagination((prev) => ({
      ...prev,
      page: nextPage,
    }));
  }

  return {
    orders,
    pagination,
    loading,
    error,
    changePage,
    retry: () => setRefreshKey((key) => key + 1),
  };
}
