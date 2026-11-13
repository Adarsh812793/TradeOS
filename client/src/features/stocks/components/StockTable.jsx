import { Link } from "react-router-dom";
import { Bookmark, ChevronRight } from "lucide-react";

import { formatCurrency } from "../../../utils/currency.utils.js";
import PriceChange from "../../../components/ui/PriceChange.jsx";
import Table from "../../../components/ui/Table.jsx";
import "./StockTable.css";

// The desktop stock list: the shared Table with one row per stock (symbol over company name, price, today's move,
// exchange, and the watchlist and details buttons). Phones use StockCard instead.
export default function StockTable({
  stocks,
  isSaved = () => false,
  isBusy = () => false,
  onToggleWatchlist,
}) {
  return (
    <Table caption="Stocks" minWidth={720}>
      <thead>
        <tr>
          <th scope="col">Stock</th>
          <th scope="col" className="data-table__num">
            Price
          </th>
          <th scope="col" className="data-table__num">
            Today
          </th>
          <th scope="col">Exchange</th>
          <th scope="col" className="data-table__actions">
            <span className="stock-table__sr-only">Actions</span>
          </th>
        </tr>
      </thead>

      <tbody>
        {stocks.map((stock) => {
          const saved = isSaved(stock._id);

          return (
            <tr key={stock._id}>
              <td>
                <Link
                  to={`/stocks/${stock._id}`}
                  className="stock-table__stock-link"
                  aria-label={`View ${stock.symbol}, ${stock.companyName}`}
                >
                  <span className="stock-table__symbol-icon" aria-hidden="true">
                    {stock.symbol.slice(0, 2)}
                  </span>

                  <span className="stock-table__identity">
                    <span className="stock-table__symbol">{stock.symbol}</span>
                    <span className="stock-table__company">
                      {stock.companyName}
                    </span>
                  </span>
                </Link>
              </td>

              <td className="data-table__num stock-table__price">
                {formatCurrency(stock.currentPrice, stock.currency)}
              </td>

              <td className="data-table__num">
                <PriceChange
                  amount={stock.dayChange}
                  percent={stock.dayChangePercent}
                  currency={stock.currency}
                  arrow
                />
              </td>

              <td>
                <span className="stock-table__exchange-badge">
                  {stock.exchange}
                </span>
              </td>

              <td className="data-table__actions">
                <div className="stock-table__actions-group">
                  <button
                    type="button"
                    className={`stock-table__icon-button ${
                      saved ? "stock-table__icon-button--saved" : ""
                    }`}
                    aria-label={
                      saved
                        ? `Remove ${stock.symbol} from watchlist`
                        : `Add ${stock.symbol} to watchlist`
                    }
                    aria-pressed={saved}
                    title={saved ? "Remove from watchlist" : "Add to watchlist"}
                    disabled={!onToggleWatchlist || isBusy(stock._id)}
                    onClick={() => onToggleWatchlist(stock)}
                  >
                    <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
                  </button>

                  <Link
                    to={`/stocks/${stock._id}`}
                    className="stock-table__icon-button"
                    aria-label={`View ${stock.symbol} details`}
                    title="View stock details"
                  >
                    <ChevronRight size={20} />
                  </Link>
                </div>
              </td>
            </tr>
          );
        })}

        {stocks.length === 0 && (
          <tr>
            <td colSpan={5} className="stock-table__empty" role="status">
              No stocks match.
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  );
}
