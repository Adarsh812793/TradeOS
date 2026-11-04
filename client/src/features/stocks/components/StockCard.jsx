
import { Link } from "react-router-dom";
import { Bookmark, ChevronRight } from "lucide-react";

import { formatCurrency } from "../../../utils/currency.utils.js";
import "./StockCard.css";

// 2. Mobile stock card
export default function StockCard({
  stock,
  isSaved = false,
  isPending = false,
  onToggleWatchlist,
}) {
  // 3. Render stock information
  return (
    <article className="stock-card">
      <Link
        to={`/stocks/${stock._id}`}
        className="stock-card__link"
        aria-label={`View ${stock.symbol}, ${stock.companyName}`}
      >
        {/* 4. Stock identity */}
        <div className="stock-card__identity">
          <div className="stock-card__icon" aria-hidden="true">
            {stock.symbol.slice(0, 2)}
          </div>

          <div className="stock-card__details">
            <span className="stock-card__symbol">
              {stock.symbol}
            </span>
            <span className="stock-card__company">
              {stock.companyName}
            </span>
          </div>
        </div>

        {/* 5. Price and exchange */}
        <div className="stock-card__price-section">
          <span className="stock-card__price">
            {formatCurrency(stock.currentPrice, stock.currency)}
          </span>
          <span className="stock-card__exchange">
            {stock.exchange}
          </span>
        </div>

        <ChevronRight
          className="stock-card__chevron"
          size={18}
          aria-hidden="true"
        />
      </Link>

      {/* 6. Watchlist action */}
      <button
        type="button"
        className={`stock-card__bookmark ${
          isSaved ? "stock-card__bookmark--saved" : ""
        }`}
        aria-label={
          isSaved
            ? `Remove ${stock.symbol} from watchlist`
            : `Add ${stock.symbol} to watchlist`
        }
        aria-pressed={isSaved}
        onClick={() => onToggleWatchlist?.(stock)}
        disabled={!onToggleWatchlist || isPending}
        title={
          onToggleWatchlist
            ? isSaved
              ? "Remove from watchlist"
              : "Add to watchlist"
            : "Watchlist integration coming soon"
        }
      >
        <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
      </button>
    </article>
  );
}
