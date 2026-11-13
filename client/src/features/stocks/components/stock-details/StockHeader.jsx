
import { Bookmark} from "lucide-react";
import { formatCurrency } from "../../../../utils/currency.utils.js";
import Button from "../../../../components/ui/Button.jsx";
import PriceChange from "../../../../components/ui/PriceChange.jsx";
import MarketStatusBadge from "../../../market/components/MarketStatusBadge.jsx";
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

            <MarketStatusBadge />
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

          <PriceChange amount={stock.dayChange} percent={stock.dayChangePercent} arrow />


        </div>

        <div className="stock-header__actions">
          {/* Green = buy, red = sell, here and in the order panel */}
          <Button variant="success" onClick={() => onTradeAction("buy")}>
            Buy
          </Button>

          <Button variant="danger" onClick={() => onTradeAction("sell")}>
            Sell
          </Button>
        </div>

      </div>
    </section>
  );
}
