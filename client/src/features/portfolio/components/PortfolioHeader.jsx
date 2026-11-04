
import { RefreshCw } from "lucide-react";

import Button from "../../../components/ui/Button.jsx";
import { formatLastUpdated } from "../utils/portfolio.utils.js";

import "./PortfolioHeader.css";

export default function PortfolioHeader({
  lastUpdated,
  refreshing = false,
  onRefresh,
}) {
  return (
    <header className="portfolio-header">
      <div>
        <h1 className="portfolio-header__title">Portfolio</h1>
        <p className="portfolio-header__subtitle">
          Track your investments and returns
        </p>
      </div>

      <div className="portfolio-header__actions">
        {lastUpdated && (
          <span className="portfolio-header__updated">
            Last updated: {formatLastUpdated(lastUpdated)}
          </span>
        )}

        <Button
          variant="secondary"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
            className={
              refreshing ? "portfolio-header__icon--spinning" : ""
            }
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
    </header>
  );
}
