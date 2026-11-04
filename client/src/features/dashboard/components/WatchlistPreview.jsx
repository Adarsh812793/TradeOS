
/* 1. Imports */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWatchlist } from "../dashboard.api.js";
import { formatCurrency } from "../../../utils/currency.utils.js";
import "./WatchlistPreview.css";

// 3. Watchlist Preview Component
export default function WatchlistPreview() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Changing this number re-runs the effect below, which reloads the watchlist (Retry button)
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = useNavigate();

  // 3.1 Fetch the user's watchlist when the component mounts and whenever refreshKey changes.
  useEffect(() => {
    // Prevents state updates after the component has been left
    let isMounted = true;

    // Fetches the watchlist and fills the list (or the error message)
    async function loadWatchlist() {
      try {
        setLoading(true);
        setError("");

        const response = await getWatchlist();

        if (isMounted) {
          setStocks(response.data);
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

    loadWatchlist();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // 3.2 Display loading and error states.
  if (loading) {
    return (
      <section className="watchlist-preview">
        <p className="watchlist-preview__message">
          Loading watchlist...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="watchlist-preview">
        <p className="watchlist-preview__error">{error}</p>

        <button
          className="watchlist-preview__button"
          onClick={() => setRefreshKey((key) => key + 1)}
        >
          Retry
        </button>
      </section>
    );
  }

  // 3.3 Display the watchlist preview.
  return (
    <section className="watchlist-preview">
      <div className="watchlist-preview__header">
        <div>
          <h2 className="watchlist-preview__title">
            My Watchlist
          </h2>
          <p className="watchlist-preview__subtitle">
            Stocks you're keeping an eye on
          </p>
        </div>

        <button
          className="watchlist-preview__button"
          onClick={() => navigate("/watchlist")}
        >
          View all →
        </button>
      </div>

      {stocks.length === 0 ? (
        <div className="watchlist-preview__empty">
          <p className="watchlist-preview__empty-title">
            Your watchlist is empty
          </p>
          <p className="watchlist-preview__empty-description">
            Add stocks to keep track of their current prices.
          </p>
          <button
            className="watchlist-preview__button"
            onClick={() => navigate("/stocks")}
          >
            Explore stocks →
          </button>
        </div>
      ) : (
        <div className="watchlist-preview__list">
          {stocks.slice(0, 5).map((item) => {
            const stock = item.stockId;

            return (
              <article
                className="watchlist-preview__item"
                key={item._id}
              >
                <div className="watchlist-preview__icon" aria-hidden="true">
                  ↗
                </div>

                <div className="watchlist-preview__details">
                  <span className="watchlist-preview__symbol">
                    {stock?.symbol ?? "Unknown stock"}
                  </span>
                  <p className="watchlist-preview__company">
                    {stock?.companyName ?? ""}
                  </p>
                </div>

                <p className="watchlist-preview__price">
                  {formatCurrency(stock?.currentPrice)}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
