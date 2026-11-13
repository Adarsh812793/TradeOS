import AccountSummary from "../features/dashboard/components/AccountSummary.jsx";
import AccountValueChart from "../features/portfolio/components/AccountValueChart.jsx";
import RecentActivity from "../features/dashboard/components/RecentActivity.jsx";
import WatchlistPreview from "../features/dashboard/components/WatchlistPreview.jsx";
import MarketStatusBadge from "../features/market/components/MarketStatusBadge.jsx";
import useCurrentUser from "../features/account/useCurrentUser.js";

import "./DashboardPage.css";

// The dashboard: how the account is doing at a glance. Top to bottom: the account value and what it is made of,
// the account value chart beside the watchlist, then the latest orders.
export default function DashboardPage() {
  const { user } = useCurrentUser();
  const firstName = user?.name?.trim().split(" ")[0];

  return (
    <div className="dashboard-page">
      <header className="dashboard-page__header">
        <div>
          <h1 className="dashboard-page__title">Dashboard</h1>
          <p className="dashboard-page__subtitle">
            {firstName ? `Welcome back, ${firstName}.` : "Your account at a glance."}
          </p>
        </div>

        <MarketStatusBadge />
      </header>

      <AccountSummary />

      <div className="dashboard-page__middle">
        <AccountValueChart />
        <WatchlistPreview />
      </div>

      <RecentActivity />
    </div>
  );
}
