
import { useCallback, useEffect, useState } from "react";
import watchlistApi from "../watchlist.api.js";

// The API returns entries whose stockId is a populated stock object (null if the stock was deleted)
const getEntryStockId = (entry) => entry.stockId?._id ?? entry.stockId;

// Returns a copy of the set with the id added or removed
function withMembership(set, id, shouldContain) {
  const next = new Set(set);

  if (shouldContain) {
    next.add(id);
  } else {
    next.delete(id);
  }

  return next;
}

// Loads the user's watchlist once and lets a list of stocks add / remove entries.
export default function useWatchlistToggle() {
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchWatchlist() {
      try {
        const response = await watchlistApi.getUserWatchlist();

        if (!isMounted) return;

        setSavedIds(
          new Set(response.data.map(getEntryStockId).filter(Boolean))
        );
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load your watchlist.");
        }
      } finally {
        if (isMounted) {
          setLoaded(true);
        }
      }
    }

    fetchWatchlist();

    return () => {
      isMounted = false;
    };
  }, []);

  const isSaved = useCallback((stockId) => savedIds.has(stockId), [savedIds]);

  // Buttons stay disabled until the watchlist has loaded (we don't know what is saved yet)
  // and while a request for that stock is in flight.
  const isBusy = useCallback(
    (stockId) => !loaded || pendingIds.has(stockId),
    [loaded, pendingIds]
  );

  const toggleWatchlist = useCallback(
    async (stock) => {
      const stockId = stock._id;

      if (!loaded || pendingIds.has(stockId)) return;

      const wasSaved = savedIds.has(stockId);

      setError("");
      setPendingIds((prev) => withMembership(prev, stockId, true));

      try {
        if (wasSaved) {
          await watchlistApi.removeFromWatchlist(stockId);
        } else {
          await watchlistApi.addToWatchlist(stockId);
        }

        setSavedIds((prev) => withMembership(prev, stockId, !wasSaved));
      } catch (err) {
        if (err.status === 409 && !wasSaved) {
          // Already in the watchlist on the server: just catch the UI up
          setSavedIds((prev) => withMembership(prev, stockId, true));
        } else if (err.status === 404 && wasSaved) {
          // Already gone from the watchlist on the server
          setSavedIds((prev) => withMembership(prev, stockId, false));
        } else {
          setError(
            err.message || `Unable to update the watchlist for ${stock.symbol}.`
          );
        }
      } finally {
        setPendingIds((prev) => withMembership(prev, stockId, false));
      }
    },
    [loaded, pendingIds, savedIds]
  );

  return { isSaved, isBusy, toggleWatchlist, error };
}
