
/* 1. Dashboard Components */
import AccountSummary from "../features/dashboard/components/AccountSummary.jsx";
import PortfolioPerformance from "../features/dashboard/components/PortfolioPerformance.jsx";
import RecentActivity from "../features/dashboard/components/RecentActivity.jsx";
import WatchlistPreview from "../features/dashboard/components/WatchlistPreview.jsx";
import MarketOverview from "../features/dashboard/components/MarketOverview.jsx";

import "./DashboardPage.css";

/* 2. Dashboard Page */
export default function DashboardPage() {
  return (
    <main className="dashboard-page">
      {/* 2.1 Account Summary */}
      <section className="dashboard-page__account">
        <AccountSummary />
      </section>

      {/* 2.2 Portfolio Performance */}
      <section className="dashboard-page__portfolio">
        <PortfolioPerformance />
      </section>

      {/* 2.3 Market Overview */}
      <section className="dashboard-page__market">
        <MarketOverview />
      </section>

      {/* 2.4 Watchlist Preview */}
      <section className="dashboard-page__watchlist">
        <WatchlistPreview />
      </section>

      {/* 2.5 Recent Activity */}
      <section className="dashboard-page__activity">
        <RecentActivity />
      </section>
    </main>
  );
}
