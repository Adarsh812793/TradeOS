import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import watchlistApi from "../features/watchlist/watchlist.api";
import useVisiblePolling from "../hooks/useVisiblePolling.js";
import MarketStatusBadge from "../features/market/components/MarketStatusBadge.jsx";
import WatchlistTable from "../features/watchlist/components/WatchlistTable";
import PageHeader from "../components/layout/PageHeader.jsx";
import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { SkeletonHeading, SkeletonRegion, SkeletonTable } from "../components/ui/Skeleton.jsx";

import "./WatchlistPage.css";

// The Watchlist page: the stocks the user saved, with their current price. Reloads quietly every 30 s so prices stay fresh.
export default function WatchlistPage() {
  const navigate = useNavigate();

  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Changing this number re-runs the effect below, which reloads the list (the Try again button)
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchWatchlist() {
      try {
        setLoading(true);
        setError("");

        const response = await watchlistApi.getUserWatchlist();

        if (isMounted) setWatchlist(response.data);
      } catch (err) {
        if (isMounted) setError(err.message || "Unable to load your watchlist.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchWatchlist();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Keep prices fresh: a quiet reload (no skeleton; a failure keeps the list as it is)
  useVisiblePolling(async () => {
    try {
      const response = await watchlistApi.getUserWatchlist();
      setWatchlist(response.data);
    } catch {
      /* keep showing the list we have */
    }
  });

  if (loading) {
    return (
      <section className="watchlist-page">
        <SkeletonRegion label="Loading your watchlist">
          <SkeletonHeading />
          <SkeletonTable columns={5} rows={5} cardsBelow={768} />
        </SkeletonRegion>
      </section>
    );
  }

  if (error) {
    return (
      <section className="watchlist-page">
        <div className="watchlist-page__error" role="alert">
          <p>{error}</p>

          <Button variant="secondary" onClick={() => setRefreshKey((key) => key + 1)}>
            Try again
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="watchlist-page">
      <PageHeader
        title="My Watchlist"
        subtitle="Track and monitor your favourite stocks"
        aside={<MarketStatusBadge />}
      />

      {watchlist.length === 0 ? (
        <EmptyState
          icon="watchlist"
          title="Your watchlist is empty"
          description="Add stocks to keep track of their prices here."
          actionLabel="Explore stocks"
          onAction={() => navigate("/stocks")}
        />
      ) : (
        <WatchlistTable watchlist={watchlist} setWatchlist={setWatchlist} />
      )}
    </section>
  );
}
