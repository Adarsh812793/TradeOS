import { useState } from "react";
import { Link } from "react-router-dom";

import watchlistApi from "../watchlist.api";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import DataCard from "../../../components/ui/DataCard.jsx";
import Table from "../../../components/ui/Table.jsx";
import { formatCurrency } from "../../../utils/currency.utils.js";
import "./WatchlistTable.css";

// "13 Nov 2026" (or a dash when the entry has no date)
function formatAddedDate(date) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// The saved stocks: the shared Table on wide screens and shared DataCards on phones (the CSS shows one of the two).
// Each stock has View (opens the stock page) and Remove (takes it off the watchlist).
export default function WatchlistTable({ watchlist, setWatchlist }) {
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState("");

  async function handleRemove(stockId) {
    try {
      setRemovingId(stockId);
      setError("");

      await watchlistApi.removeFromWatchlist(stockId);

      setWatchlist((prev) => prev.filter((item) => item.stockId._id !== stockId));
    } catch (err) {
      setError(err.message || "Unable to remove this stock from your watchlist.");
    } finally {
      setRemovingId(null);
    }
  }

  // The View and Remove buttons of one stock (the same in the table and in the card)
  function renderActions(stock) {
    return (
      <div className="watchlist-actions">
        <Button as={Link} to={`/stocks/${stock._id}`} variant="secondary" size="sm">
          View
        </Button>

        <Button
          variant="danger"
          size="sm"
          loading={removingId === stock._id}
          onClick={() => handleRemove(stock._id)}
          aria-label={`Remove ${stock.symbol} from watchlist`}
        >
          Remove
        </Button>
      </div>
    );
  }

  return (
    <>
      {error && (
        <p className="watchlist-table__error" role="alert">
          {error}
        </p>
      )}

      {/* Wide screens: table */}
      <Table className="watchlist-table-wrapper" caption="Your watchlist">
        <thead>
          <tr>
            <th scope="col">Stock</th>
            <th scope="col">Exchange</th>
            <th scope="col" className="data-table__num">Current price</th>
            <th scope="col">Added on</th>
            <th scope="col" className="data-table__actions">
              <span className="watchlist-table__sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {watchlist.map((entry) => {
            const stock = entry.stockId;

            return (
              <tr key={entry._id}>
                <td>
                  <div className="watchlist-stock">
                    <span className="watchlist-stock__symbol">{stock.symbol}</span>
                    <span className="watchlist-stock__name">{stock.companyName}</span>
                  </div>
                </td>

                <td>
                  <Badge>{stock.exchange}</Badge>
                </td>

                <td className="data-table__num watchlist-price">
                  {formatCurrency(stock.currentPrice, stock.currency)}
                </td>

                <td>{formatAddedDate(entry.createdAt)}</td>

                <td className="data-table__actions">{renderActions(stock)}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {/* Phones: cards */}
      <div className="watchlist-cards">
        {watchlist.map((entry) => {
          const stock = entry.stockId;

          return (
            <DataCard
              key={entry._id}
              title={stock.symbol}
              subtitle={stock.companyName}
              badge={<Badge>{stock.exchange}</Badge>}
              items={[
                { label: "Current price", value: formatCurrency(stock.currentPrice, stock.currency) },
                { label: "Added on", value: formatAddedDate(entry.createdAt) },
              ]}
              footer={renderActions(stock)}
            />
          );
        })}
      </div>
    </>
  );
}
