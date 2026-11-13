import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getRecentOrders } from "../dashboard.api.js";
import { formatCurrency } from "../../../utils/currency.utils.js";
import { formatRelativeTime } from "../../../utils/date.utils.js";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { SkeletonList, SkeletonRegion } from "../../../components/ui/Skeleton.jsx";
import "./RecentActivity.css";

// Badge colour of each order status
const statusVariants = {
  EXECUTED: "success",
  PENDING: "warning",
  REJECTED: "danger",
};

// The dashboard's recent activity card: the latest five orders (type, stock, quantity, amount, status, how long ago).
export default function RecentActivity() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Changing this number re-runs the effect below, which reloads the orders (Try again button)
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    // Prevents state updates after the component has been left
    let isMounted = true;

    async function loadOrders() {
      try {
        setLoading(true);
        setError("");

        const response = await getRecentOrders();

        if (isMounted) setOrders(response.data.items);
      } catch (err) {
        if (isMounted) setError(err.message || "Unable to load recent activity.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  return (
    <Card className="recent-activity" padding="lg" shadow>
      <div className="recent-activity__header">
        <h2 className="recent-activity__title">Recent activity</h2>

        <Button as={Link} to="/orders" variant="ghost" size="sm">
          View all
        </Button>
      </div>

      {loading ? (
        <SkeletonRegion label="Loading recent activity">
          <SkeletonList rows={4} rowHeight={56} />
        </SkeletonRegion>
      ) : error ? (
        <div className="recent-activity__error" role="alert">
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={() => setRefreshKey((key) => key + 1)}>
            Try again
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="orders"
          title="No trading activity yet"
          description="Your recent buy and sell orders will appear here."
          actionLabel="Explore stocks"
          onAction={() => navigate("/stocks")}
        />
      ) : (
        <ul className="recent-activity__list">
          {orders.map((order) => {
            const stock = order.stockId;
            const status = order.status ?? "PENDING";

            return (
              <li key={order._id} className="recent-activity__item">
                <Badge variant={order.type === "BUY" ? "success" : "danger"}>
                  {order.type}
                </Badge>

                <span className="recent-activity__details">
                  <span className="recent-activity__symbol">
                    {stock?.symbol ?? "Unknown stock"}
                  </span>
                  <span className="recent-activity__meta">
                    {order.quantity} {order.quantity === 1 ? "share" : "shares"} ·{" "}
                    {formatRelativeTime(order.createdAt)}
                  </span>
                </span>

                <span className="recent-activity__right">
                  <span className="recent-activity__amount">
                    {formatCurrency(order.totalValue)}
                  </span>
                  <Badge variant={statusVariants[status] ?? "neutral"}>{status}</Badge>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
