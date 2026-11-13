import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getWatchlist } from "../dashboard.api.js";
import useVisiblePolling from "../../../hooks/useVisiblePolling.js";
import { formatCurrency } from "../../../utils/currency.utils.js";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { SkeletonList, SkeletonRegion } from "../../../components/ui/Skeleton.jsx";
import "./WatchlistPreview.css";

// The dashboard's watchlist card: up to five saved stocks with their current price; each row opens the stock page.
// Reloads quietly every 30 s so the prices stay fresh.
export default function WatchlistPreview() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Changing this number re-runs the effect below, which reloads the watchlist (Try again button)
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    // Prevents state updates after the component has been left
    let isMounted = true;

    async function loadWatchlist() {
      try {
        setLoading(true);
        setError("");

        const response = await getWatchlist();

        if (isMounted) setStocks(response.data);
      } catch (err) {
        if (isMounted) setError(err.message || "Unable to load your watchlist.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadWatchlist();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Keep prices fresh: a quiet reload (no skeleton; a failure keeps the list as it is)
  useVisiblePolling(async () => {
    try {
      const response = await getWatchlist();
      setStocks(response.data);
    } catch {
      /* keep showing the list we have */
    }
  });

  return (
    <Card className="watchlist-preview" padding="lg" shadow>
      <div className="watchlist-preview__header">
        <h2 className="watchlist-preview__title">Watchlist</h2>

        <Button as={Link} to="/watchlist" variant="ghost" size="sm">
          View all
        </Button>
      </div>

      {loading ? (
        <SkeletonRegion label="Loading watchlist">
          <SkeletonList rows={3} rowHeight={56} />
        </SkeletonRegion>
      ) : error ? (
        <div className="watchlist-preview__error" role="alert">
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={() => setRefreshKey((key) => key + 1)}>
            Try again
          </Button>
        </div>
      ) : stocks.length === 0 ? (
        <EmptyState
          icon="watchlist"
          title="Your watchlist is empty"
          description="Add stocks to keep track of their prices."
          actionLabel="Explore stocks"
          onAction={() => navigate("/stocks")}
        />
      ) : (
        <ul className="watchlist-preview__list">
          {stocks.slice(0, 5).map((item) => {
            const stock = item.stockId;

            return (
              <li key={item._id}>
                <Link
                  to={stock ? `/stocks/${stock._id}` : "/watchlist"}
                  className="watchlist-preview__item"
                >
                  <span className="watchlist-preview__avatar" aria-hidden="true">
                    {(stock?.symbol ?? "?").slice(0, 2)}
                  </span>

                  <span className="watchlist-preview__details">
                    <span className="watchlist-preview__symbol">
                      {stock?.symbol ?? "Unknown stock"}
                    </span>
                    <span className="watchlist-preview__company">
                      {stock?.companyName ?? ""}
                    </span>
                  </span>

                  <span className="watchlist-preview__price">
                    {formatCurrency(stock?.currentPrice)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
