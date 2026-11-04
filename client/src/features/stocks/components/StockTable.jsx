
import { Link } from "react-router-dom";
import { Bookmark, ChevronRight } from "lucide-react";

import { formatCurrency } from "../../../utils/currency.utils.js";
import "./StockTable.css";

// 2. Stock table component
export default function StockTable({
  stocks,
  isSaved = () => false,
  isBusy = () => false,
  onToggleWatchlist,
}) {
  return (
    <div className="stock-table-wrapper">
      <table className="stock-table">
        {/* 3. Table headers */}
        <thead>
          <tr>
            <th scope="col">Stock</th>
            <th scope="col">Company</th>
            <th scope="col" className="stock-table__price-heading">
              Price
            </th>
            <th scope="col" className="stock-table__exchange-heading">
              Exchange
            </th>
            <th scope="col" className="stock-table__actions-heading">
              Actions
            </th>
          </tr>
        </thead>

        {/* 4. Render stock rows */}
        <tbody>
          {stocks.map((stock) => (
            <tr key={stock._id}>
              <td>
                <Link
                  to={`/stocks/${stock._id}`}
                  className="stock-table__stock-link"
                  aria-label={`View ${stock.symbol} details`}
                >
                  <span className="stock-table__symbol-icon" aria-hidden="true">
                    {stock.symbol.slice(0, 2)}
                  </span>

                  <span className="stock-table__symbol">
                    {stock.symbol}
                  </span>
                </Link>
              </td>

              <td className="stock-table__company">
                {stock.companyName}
              </td>

              <td className="stock-table__price">
                {formatCurrency(stock.currentPrice, stock.currency)}
              </td>

              <td className="stock-table__exchange">
                <span className="stock-table__exchange-badge">
                  {stock.exchange}
                </span>
              </td>

              <td className="stock-table__actions">
                <div className="stock-table__actions-group">
                  <button
                    type="button"
                    className={`stock-table__bookmark ${
                      isSaved(stock._id) ? "stock-table__bookmark--saved" : ""
                    }`}
                    aria-label={
                      isSaved(stock._id)
                        ? `Remove ${stock.symbol} from watchlist`
                        : `Add ${stock.symbol} to watchlist`
                    }
                    aria-pressed={isSaved(stock._id)}
                    title={
                      isSaved(stock._id)
                        ? "Remove from watchlist"
                        : "Add to watchlist"
                    }
                    disabled={!onToggleWatchlist || isBusy(stock._id)}
                    onClick={() => onToggleWatchlist(stock)}
                  >
                    <Bookmark
                      size={18}
                      fill={isSaved(stock._id) ? "currentColor" : "none"}
                    />
                  </button>

                  <Link
                    to={`/stocks/${stock._id}`}
                    className="stock-table__details-link"
                    aria-label={`View ${stock.symbol} details`}
                    title="View stock details"
                  >
                    <ChevronRight size={20} />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 5. Empty state */}
      {stocks.length === 0 && (
        <div className="stock-table__empty" role="status">
          No stocks are available right now.
        </div>
      )}
    </div>
  );
}
