import { useEffect, useState } from "react";

import { getWallet, getPortfolio } from "../dashboard.api.js";
import { formatCurrency } from "../../../utils/currency.utils.js";
import useVisiblePolling from "../../../hooks/useVisiblePolling.js";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import PriceChange from "../../../components/ui/PriceChange.jsx";
import { SkeletonRegion, SkeletonStats } from "../../../components/ui/Skeleton.jsx";
import "./AccountSummary.css";

// Turns the wallet and portfolio answers into the figures the dashboard shows. Account value is cash plus what the
// holdings are worth now (both are already rounded to paise, so the sum is rounded back to paise).
const buildSummary = (walletResponse, portfolioResponse) => {
  const portfolioSummary = portfolioResponse.data.summary;
  const cash = walletResponse.data.balance;

  return {
    accountValue: Math.round((cash + portfolioSummary.totalCurrentValue) * 100) / 100,
    cash,
    investedAmount: portfolioSummary.totalInvestedValue,
    holdingsValue: portfolioSummary.totalCurrentValue,
    unrealizedPnL: portfolioSummary.totalUnrealizedPnL,
    pnlPercentage: portfolioSummary.totalPnLPercentage,
  };
};

// The top of the dashboard: the account value as a hero (cash plus holdings, with the unrealised profit or loss under
// it), then the three figures it is made of. Reloads quietly every 30 s so the numbers follow the prices.
export default function AccountSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadSummary() {
      try {
        setLoading(true);
        setError("");

        const [walletResponse, portfolioResponse] = await Promise.all([
          getWallet(),
          getPortfolio(),
        ]);

        if (isActive) setSummary(buildSummary(walletResponse, portfolioResponse));
      } catch (err) {
        if (isActive) setError(err.message || "Unable to load your account summary.");
      } finally {
        if (isActive) setLoading(false);
      }
    }

    loadSummary();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  // Profit and loss follow the prices: a quiet reload (no skeleton; a failure keeps the figures)
  useVisiblePolling(async () => {
    try {
      const [walletResponse, portfolioResponse] = await Promise.all([getWallet(), getPortfolio()]);
      setSummary(buildSummary(walletResponse, portfolioResponse));
    } catch {
      /* keep showing the figures we have */
    }
  });

  if (loading) {
    return (
      <section className="account-summary">
        <SkeletonRegion label="Loading account summary">
          <SkeletonStats count={4} />
        </SkeletonRegion>
      </section>
    );
  }

  if (error) {
    return (
      <section className="account-summary">
        <div className="account-summary__error" role="alert">
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={() => setRefreshKey((key) => key + 1)}>
            Try again
          </Button>
        </div>
      </section>
    );
  }

  const stats = [
    { label: "Cash", value: summary.cash, description: "Available virtual money" },
    { label: "Holdings", value: summary.holdingsValue, description: "What your shares are worth now" },
    { label: "Invested", value: summary.investedAmount, description: "What your shares cost" },
  ];

  return (
    <section className="account-summary" aria-label="Account summary">
      <Card className="account-summary__card account-summary__card--hero" padding="lg" shadow>
        <span className="account-summary__label">Account value</span>

        <p className="account-summary__value account-summary__value--hero">
          {formatCurrency(summary.accountValue)}
        </p>

        <p className="account-summary__pnl">
          <PriceChange amount={summary.unrealizedPnL} percent={summary.pnlPercentage} arrow />
          <span className="account-summary__description">unrealised on your holdings</span>
        </p>
      </Card>

      {stats.map((stat) => (
        <Card key={stat.label} className="account-summary__card" padding="lg" shadow>
          <span className="account-summary__label">{stat.label}</span>
          <p className="account-summary__value">{formatCurrency(stat.value)}</p>
          <p className="account-summary__description">{stat.description}</p>
        </Card>
      ))}
    </section>
  );
}
