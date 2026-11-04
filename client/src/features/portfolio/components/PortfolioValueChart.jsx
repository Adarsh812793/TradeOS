
import { TrendingUp } from "lucide-react";

import Card from "../../../components/ui/Card.jsx";

import "./PortfolioValueChart.css";

// Placeholder: there is no value history yet (see docs/plans/portfolio-page.md, "Portfolio Value chart").
// When the data exists, replace the empty panel below with the chart.
export default function PortfolioValueChart() {
  return (
    <Card className="portfolio-value-chart" padding="lg" shadow>
      <h2 className="portfolio-value-chart__title">Portfolio Value (7D)</h2>
      <p className="portfolio-value-chart__subtitle">
        How your portfolio value has changed over the last 7 days.
      </p>

      <div className="portfolio-value-chart__empty">
        <span className="portfolio-value-chart__icon" aria-hidden="true">
          <TrendingUp size={28} />
        </span>

        <h3>Value history coming soon</h3>

        <p>
          Your portfolio value will be charted here once we start tracking it
          over time.
        </p>
      </div>
    </Card>
  );
}
