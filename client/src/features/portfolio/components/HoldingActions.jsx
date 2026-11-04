
import { Link } from "react-router-dom";

// Real links (not buttons) so they can be opened in a new tab.
// Sell opens the stock page on the Sell form. Styles live in HoldingsTable.css.
export default function HoldingActions({ stock }) {
  const stockUrl = `/stocks/${stock._id}`;

  return (
    <div className="holding-actions">
      <Link
        to={stockUrl}
        className="btn holding-action holding-action--buy"
        aria-label={`Buy more ${stock.symbol}`}
      >
        Buy
      </Link>

      <Link
        to={`${stockUrl}?action=sell`}
        className="btn holding-action holding-action--sell"
        aria-label={`Sell ${stock.symbol}`}
      >
        Sell
      </Link>
    </div>
  );
}
