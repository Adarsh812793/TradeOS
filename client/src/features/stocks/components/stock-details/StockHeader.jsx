
import { Bookmark} from "lucide-react";
import { formatCurrency } from "../../../../utils/currency.utils.js";
import "./StockHeader.css";

// 2. Stock Header component
export default function StockHeader({
  stock,
  onTradeAction,
  isInWatchlist = false,
  onWatchlistToggle,
  isWatchlistLoading
}) {
  // 3. Handle missing stock data
  if (!stock) {
    return null;
  }

  return (
    <section className="stock-header">
      {/* 4. Stock identity */}
      <div className="stock-header__identity">

        <div className="stock-header__symbol-badge" aria-hidden="true">
          {stock.symbol.slice(0, 2)}
        </div>

        <div className="stock-header__details">
          <h1 className="stock-header__company-name">
            {stock.companyName}
          </h1>

          <div className="stock-header__metadata">
            <span className="stock-header__badge">
              {stock.symbol}
            </span>

            <span className="stock-header__badge">
              {stock.exchange}
            </span>
          </div>
        </div>

        {/* 5. Watchlist button */}
        <button
          type="button"
          className={`stock-header__watchlist-button ${
            isInWatchlist
              ? "stock-header__watchlist-button--active"
              : ""
          }`}
          onClick={onWatchlistToggle}
          disabled={isWatchlistLoading}
          aria-label={
            isInWatchlist
              ? "Remove stock from watchlist"
              : "Add stock to watchlist"
          }
          aria-pressed={isInWatchlist}
          title={
            isInWatchlist
              ? "Remove from watchlist"
              : "Add to watchlist"
          }
        >
          <Bookmark
            size={20}
            fill={isInWatchlist ? "currentColor" : "none"}
          />
        </button>
      </div>

      {/* 6. Price and trading actions */}
      <div className="stock-header__trading">
        <div className="stock-header__price">
          <span className="stock-header__price-value">
            {formatCurrency(stock.currentPrice, stock.currency)}
          </span>

          <span className="stock-header__price-caption">
            current-prev close<br></br>
            P & L percent
          </span>

        </div>

        <div className="stock-header__actions">
          <button
            type="button"
            className="stock-header__action-button stock-header__action-button--buy"
            onClick={() => onTradeAction("buy")}
          >
            Buy
          </button>

          <button
            type="button"
            className="stock-header__action-button stock-header__action-button--sell"
            onClick={() => onTradeAction("sell")}
          >
            Sell
          </button>
        </div>

      </div>
    </section>
  );
}
