import { Link } from "react-router-dom";

import Button from "../../../components/ui/Button.jsx";

// Buy and Sell for one holding: the shared Button rendered as real links (so they open in a new tab too).
// Buy opens the stock page; Sell opens it on the Sell form. Green = buy, red = sell, as everywhere.
export default function HoldingActions({ stock }) {
  const stockUrl = `/stocks/${stock._id}`;

  return (
    <div className="holding-actions">
      <Button
        as={Link}
        to={stockUrl}
        variant="success"
        size="sm"
        aria-label={`Buy more ${stock.symbol}`}
      >
        Buy
      </Button>

      <Button
        as={Link}
        to={`${stockUrl}?action=sell`}
        variant="danger"
        size="sm"
        aria-label={`Sell ${stock.symbol}`}
      >
        Sell
      </Button>
    </div>
  );
}
