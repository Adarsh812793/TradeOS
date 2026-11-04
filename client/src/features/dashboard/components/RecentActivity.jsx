
/* 1. Imports */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRecentOrders } from "../dashboard.api.js";
import { formatCurrency } from "../../../utils/currency.utils.js";
import "./RecentActivity.css";

// 2. Order Status Configuration
const statusStyles = {
  EXECUTED: "success",
  PENDING: "warning",
  REJECTED: "danger",
};

// 4. Recent Activity Component
export default function RecentActivity() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Changing this number re-runs the effect below, which reloads the orders (Retry button)
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = useNavigate();

  // 4.1 Fetch the latest orders when the component mounts and whenever refreshKey changes.
  useEffect(() => {
    // Prevents state updates after the component has been left
    let isMounted = true;

    // Fetches the latest orders and fills the list (or the error message)
    async function loadOrders() {
      try {
        setLoading(true);
        setError("");

        const response = await getRecentOrders();

        if (isMounted) {
          setOrders(response.data.items);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load recent activity.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // 4.2 Display the loading state.
  if (loading) {
    return (
      <section className="recent-activity">
        <p className="recent-activity__message">
          Loading recent activity...
        </p>
      </section>
    );
  }

  // 4.3 Display the error state with a retry action.
  if (error) {
    return (
      <section className="recent-activity">
        <p className="recent-activity__error">{error}</p>

        <button
          className="recent-activity__retry"
          onClick={() => setRefreshKey((key) => key + 1)}
        >
          Retry
        </button>
      </section>
    );
  }

  // 4.4 Display the recent orders.
  return (
    <section className="recent-activity">
      <div className="recent-activity__header">
        <div>
          <h2 className="recent-activity__title">
            Recent Activity
          </h2>
          <p className="recent-activity__subtitle">
            Your latest trading orders
          </p>
        </div>

        <button
          className="recent-activity__view-all"
          onClick={() => navigate("/orders")}
        >
          View all
          <span aria-hidden="true">→</span>
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="recent-activity__empty">
          <p className="recent-activity__empty-title">
            No trading activity yet
          </p>
          <p className="recent-activity__empty-description">
            Your recent buy and sell orders will appear here.
          </p>
          <button
            className="recent-activity__view-all"
            onClick={() => navigate("/stocks")}
          >
            Explore stocks →
          </button>
        </div>
      ) : (
        <div className="recent-activity__list">
          {orders.map((order) => {
            const stock = order.stockId;
            const symbol = stock?.symbol ?? "Unknown stock";
            const companyName = stock?.companyName ?? "";
            const status = order.status ?? "PENDING";

            return (
              <article
                className="recent-activity__item"
                key={order._id}
              >
                <div
                  className={`recent-activity__type recent-activity__type--${order.type?.toLowerCase()}`}
                  aria-hidden="true"
                >
                  {order.type === "BUY" ? "↙" : "↗"}
                </div>

                <div className="recent-activity__details">
                  <div className="recent-activity__stock-line">
                    <span className="recent-activity__symbol">
                      {symbol}
                    </span>

                    <span
                      className={`recent-activity__trade-type recent-activity__trade-type--${order.type?.toLowerCase()}`}
                    >
                      {order.type}
                    </span>
                  </div>

                  <p className="recent-activity__company">
                    {companyName
                      ? `${companyName} · `
                      : ""}
                    {order.quantity} shares
                  </p>
                </div>

                <div className="recent-activity__right">
                  <p className="recent-activity__price">
                    {formatCurrency(order.totalValue)}
                  </p>

                  <span
                    className={`recent-activity__status recent-activity__status--${statusStyles[status] ?? "neutral"}`}
                  >
                    {status}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
