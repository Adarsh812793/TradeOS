import { TrendingUp } from "lucide-react";

import Card from "../../../components/ui/Card.jsx";
import "./PortfolioPerformance.css";

// Placeholder until the history endpoint exists (PR 2 of Phase 7). The chart will show "account value": your holdings
// plus your cash, day by day.
export default function PortfolioPerformance() {
  return (
    <Card className="portfolio-performance" padding="lg" shadow>
      <h2 className="portfolio-performance__title">Account value</h2>
      <p className="portfolio-performance__subtitle">
        Your holdings plus your cash, over time.
      </p>

      <div className="portfolio-performance__empty">
        <span className="portfolio-performance__icon" aria-hidden="true">
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
