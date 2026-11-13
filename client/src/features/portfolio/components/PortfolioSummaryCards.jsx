import Card from "../../../components/ui/Card.jsx";
import PriceChange from "../../../components/ui/PriceChange.jsx";
import { formatCurrency } from "../../../utils/currency.utils.js";
import { getPnlTone } from "../../../utils/change.utils.js";

import "./PortfolioSummaryCards.css";

// The top of the Portfolio page: the one number that matters (what your holdings are worth now), then what you
// put in, then what you made. Summary before detail: the table below only explains these three.
export default function PortfolioSummaryCards({ summary }) {
  const pnlTone = getPnlTone(summary.totalUnrealizedPnL);

  return (
    <div className="portfolio-summary">
      <Card
        className="portfolio-summary__card portfolio-summary__card--hero"
        padding="lg"
        shadow
      >
        <span className="portfolio-summary__label">Current value</span>

        {/* Green when you are in profit, red in loss, white at zero (same rule as every other P&L figure) */}
        <p
          className={`portfolio-summary__value portfolio-summary__value--hero portfolio-summary__value--${pnlTone}`}
        >
          {formatCurrency(summary.totalCurrentValue)}
        </p>

        <p className="portfolio-summary__description">
          Market value of your holdings
        </p>
      </Card>

      <Card className="portfolio-summary__card" padding="lg" shadow>
        <span className="portfolio-summary__label">Invested</span>

        <p className="portfolio-summary__value">
          {formatCurrency(summary.totalInvestedValue)}
        </p>

        <p className="portfolio-summary__description">Cost of your holdings</p>
      </Card>

      <Card className="portfolio-summary__card" padding="lg" shadow>
        <span className="portfolio-summary__label">Total return</span>

        <p className="portfolio-summary__value">
          <PriceChange
            amount={summary.totalUnrealizedPnL}
            percent={summary.totalPnLPercentage}
            arrow
          />
        </p>

        <p className="portfolio-summary__description">
          Unrealised profit or loss
        </p>
      </Card>
    </div>
  );
}
