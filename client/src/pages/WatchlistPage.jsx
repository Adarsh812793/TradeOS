import { useEffect, useState } from "react";

import watchlistApi from "../features/watchlist/watchlist.api";
import WatchlistTable from "../features/watchlist/components/WatchlistTable";

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchWatchlist() {
      try {
        setLoading(true);
        setError("");

        const response = await watchlistApi.getUserWatchlist();

        // Adjust this according to your controller response.
        const data = response.data;

        if (isMounted) {
          setWatchlist(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load your watchlist.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchWatchlist();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <p>Loading your watchlist...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (watchlist.length === 0) {
    return (
      <section className="watchlist-page">
        <h1>My Watchlist</h1>
        <p>
          Your watchlist is empty. Add stocks to keep track of them here.
        </p>
      </section>
    );
  }

  return (
    <section className="watchlist-page">
      <header className="watchlist-page__header">
        <div>
          <h1>My Watchlist</h1>
          <p>Track and monitor your favourite stocks</p>
        </div>

      </header>
        <WatchlistTable
        watchlist={watchlist}
        setWatchlist={setWatchlist}
        />
    </section>
  );
}