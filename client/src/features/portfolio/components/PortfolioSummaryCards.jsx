
import {
  Layers,
  Percent,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import Card from "../../../components/ui/Card.jsx";
import { formatCurrency } from "../../../utils/currency.utils.js";
import {
  formatSignedCurrency,
  formatSignedPercent,
  getPnlTone,
} from "../utils/portfolio.utils.js";

import "./PortfolioSummaryCards.css";

export default function PortfolioSummaryCards({ summary }) {
  const pnlTone = getPnlTone(summary.totalUnrealizedPnL);
  const returnsTone = getPnlTone(summary.totalPnLPercentage);

  const cards = [
    {
      label: "Current Portfolio Value",
      value: formatCurrency(summary.totalCurrentValue),
      description: "Market value of your holdings",
      Icon: Wallet,
      tone: "neutral",
    },
    {
      label: "Total Invested",
      value: formatCurrency(summary.totalInvestedValue),
      description: "Cost of your holdings",
      Icon: Layers,
      tone: "neutral",
      iconTone: "info",
    },
    {
      label: "Total P&L",
      value: formatSignedCurrency(summary.totalUnrealizedPnL),
      description: "Unrealized profit or loss",
      Icon: pnlTone === "loss" ? TrendingDown : TrendingUp,
      tone: pnlTone,
    },
    {
      label: "Total Returns",
      value: formatSignedPercent(summary.totalPnLPercentage),
      description: "Return on invested value",
      Icon: Percent,
      tone: returnsTone,
    },
  ];

  return (
    <div className="portfolio-summary">
      {cards.map(({ label, value, description, Icon, tone, iconTone = tone }) => (
        <Card
          key={label}
          className="portfolio-summary__card"
          padding="lg"
          shadow
        >
          <div className="portfolio-summary__top">
            <span
              className={`portfolio-summary__icon portfolio-summary__icon--${iconTone}`}
              aria-hidden="true"
            >
              <Icon size={20} />
            </span>

            <span className="portfolio-summary__label">{label}</span>
          </div>

          <p
            className={`portfolio-summary__value portfolio-summary__value--${tone}`}
          >
            {value}
          </p>

          <p className="portfolio-summary__description">{description}</p>
        </Card>
      ))}
    </div>
  );
}
