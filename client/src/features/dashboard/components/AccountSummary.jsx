
import { useEffect, useState } from "react";
import {
  getWallet,
  getPortfolio,
} from "../dashboard.api.js";
import { formatCurrency } from "../../../utils/currency.utils.js";
import useVisiblePolling from "../../../hooks/useVisiblePolling.js";
import MarketStatusBadge from "../../market/components/MarketStatusBadge.jsx";
import { SkeletonRegion, SkeletonStats } from "../../../components/ui/Skeleton.jsx";
import "./AccountSummary.css";

const formatPercentage = (value) => {
  return `${Number(value ?? 0).toFixed(2)}%`;
};

// Turns the wallet and portfolio answers into the four summary figures
const buildSummary = (walletResponse, portfolioResponse) => {
  const portfolioSummary = portfolioResponse.data.summary;

  return {
    walletBalance: walletResponse.data.balance,
    investedAmount: portfolioSummary.totalInvestedValue,
    currentValue: portfolioSummary.totalCurrentValue,
    unrealizedPnL: portfolioSummary.totalUnrealizedPnL,
    pnlPercentage: portfolioSummary.totalPnLPercentage,
  };
};

// 2. Account Summary
export default function AccountSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadSummary() {
      try {
        setLoading(true);
        setError("");

        const [walletResponse, portfolioResponse] =
          await Promise.all([
            getWallet(),
            getPortfolio(),
          ]);

        if (!isActive) return;

        setSummary(buildSummary(walletResponse, portfolioResponse));
      } catch (err) {
        if (isActive) {
          setError(
            err.message || "Unable to load your account summary."
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      isActive = false;
    };
  }, []);

  // Profit and loss follow the prices: reload quietly every 30 s while the tab is visible (a failure keeps the figures)
  useVisiblePolling(async () => {
    try {
      const [walletResponse, portfolioResponse] = await Promise.all([getWallet(), getPortfolio()]);
      setSummary(buildSummary(walletResponse, portfolioResponse));
    } catch {
      /* keep showing the figures we have */
    }
  });

  // 3. Loading and Error States
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
        <p className="account-summary__error">{error}</p>
        <button
          className="account-summary__retry"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </section>
    );
  }

  // 4. Summary Cards
  const isProfit = summary.unrealizedPnL >= 0;

  const cards = [
    {
      label: "Wallet Balance",
      value: formatCurrency(summary.walletBalance),
      description: "Available virtual cash",
      icon: "wallet",
      tone: "green",
    },
    {
      label: "Invested Amount",
      value: formatCurrency(summary.investedAmount),
      description: "Cost of current holdings",
      icon: "briefcase",
      tone: "blue",
    },
    {
      label: "Current Portfolio Value",
      value: formatCurrency(summary.currentValue),
      description: "Current value of holdings",
      icon: "chart",
      tone: "purple",
    },
    {
      label: "Unrealized P&L",
      value: `${isProfit ? "+" : "-"}${formatCurrency(
        Math.abs(summary.unrealizedPnL)
      )}`,
      description: `${formatPercentage(summary.pnlPercentage)} return`,
      icon: isProfit ? "↗" : "↘",
      tone: isProfit ? "green" : "red",
    },
  ];

  return (
    <section className="account-summary">
      <div className="account-summary__header">
        <div>
          <h2 className="account-summary__title">
            Account Summary
          </h2>
          <p className="account-summary__subtitle">
            An overview of your virtual trading account
          </p>
          <MarketStatusBadge className="account-summary__market" />
        </div>
      </div>

      <div className="account-summary__grid">
        {cards.map((card) => (
          <article
            className="account-summary__card"
            key={card.label}
          >
            <div className="account-summary__card-top">
              <span className="account-summary__label">
                {card.label}
              </span>

              <span
                className={`account-summary__icon account-summary__icon--${card.tone}`}
                aria-hidden="true"
              >
                {card.icon === "wallet"
                  ? "₹"
                  : card.icon === "briefcase"
                    ? "▣"
                    : card.icon === "chart"
                      ? "▥"
                      : card.icon}
              </span>
            </div>

            <p
              className={`account-summary__value ${
                card.label === "Unrealized P&L"
                  ? `account-summary__value--${card.tone}`
                  : ""
              }`}
            >
              {card.value}
            </p>

            <p className="account-summary__description">
              {card.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
