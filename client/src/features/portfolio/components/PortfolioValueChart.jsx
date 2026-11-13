import { TrendingUp } from "lucide-react";

import Card from "../../../components/ui/Card.jsx";

import "./PortfolioValueChart.css";

// Placeholder until the history endpoint exists (PR 2 of Phase 7): the chart will show "account value", which is your
// holdings plus your cash, so buying and selling shares alone never looks like a gain or a loss.
export default function PortfolioValueChart() {
  return (
    <Card className="portfolio-value-chart" padding="lg" shadow>
      <h2 className="portfolio-value-chart__title">Account value</h2>
      <p className="portfolio-value-chart__subtitle">
        Your holdings plus your cash, over time.
      </p>

      <div className="portfolio-value-chart__empty">
        <span className="portfolio-value-chart__icon" aria-hidden="true">
          <TrendingUp size={28} />
        </span>

        <h3>History coming soon</h3>

        <p>
          The chart will appear here once we can show how your account value
          has changed day by day.
        </p>
      </div>
    </Card>
  );
}
