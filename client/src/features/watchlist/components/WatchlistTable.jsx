import { useState } from "react";
import { useNavigate } from "react-router-dom";

import watchlistApi from "../watchlist.api";
import "./WatchlistTable.css";

export default function WatchlistTable({ watchlist, setWatchlist }) {
  const navigate = useNavigate();

  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState("");

  async function handleRemove(stockId) {
    try {
      setRemovingId(stockId);
      setError("");

      await watchlistApi.removeFromWatchlist(stockId);

      setWatchlist((prev) =>
        prev.filter((item) => item.stockId._id !== stockId)
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to remove this stock from your watchlist."
      );
    } finally {
      setRemovingId(null);
    }
  }

  function handleViewDetails(stockId) {
    navigate(`/stocks/${stockId}`);
  }

  return (
    <div className="watchlist-table-wrapper">
      {error && <p className="watchlist-table__error">{error}</p>}

      <table className="watchlist-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Stock</th>
            <th>Exchange</th>
            <th>Current Price</th>
            <th>Added On</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {watchlist.map((entry, index) => {
            const stock = entry.stockId;

            return (
              <tr key={entry._id}>
                <td>{index + 1}</td>

                <td>
                  <div className="watchlist-stock">
                    <span className="watchlist-stock__symbol">
                      {stock.symbol}
                    </span>

                    <span className="watchlist-stock__name">
                      {stock.companyName}
                    </span>
                  </div>
                </td>

                <td>
                  <span className="watchlist-exchange">
                    {stock.exchange}
                  </span>
                </td>

                <td className="watchlist-price">
                  {stock.currency}{" "}
                  {Number(stock.currentPrice).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>

                <td>
                  {entry.createdAt
                    ? new Date(entry.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </td>

                <td>
                  <div className="watchlist-actions">
                    <button
                      className="watchlist-actions__view"
                      onClick={() => handleViewDetails(stock._id)}
                    >
                      View
                    </button>

                    <button
                      className="watchlist-actions__remove"
                      onClick={() => handleRemove(stock._id)}
                      disabled={removingId === stock._id}
                      aria-label={`Remove ${stock.symbol} from watchlist`}
                    >
                      {removingId === stock._id ? "..." : "Remove"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}