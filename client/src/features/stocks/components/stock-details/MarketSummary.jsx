
import {
  BadgeInfo,
  Building2,
  CircleDollarSign,
  Tag,
} from "lucide-react";

import { formatCurrency } from "../../../../utils/currency.utils.js";
import "./MarketSummary.css";

// 1. Market Summary component
export default function MarketSummary({ stock }) {
  // 2. Handle missing stock data
  if (!stock) {
    return null;
  }

  // 3. Define the summary cards
  const summaryItems = [
    {
      id: "symbol",
      label: "Symbol",
      value: stock.symbol,
      description: "Stock symbol",
      icon: Tag,
    },
    {
      id: "company",
      label: "Company Name",
      value: stock.companyName,
      description: "Listed company name",
      icon: Building2,
    },
    {
      id: "exchange",
      label: "Exchange",
      value: stock.exchange,
      description: "Stock exchange",
      icon: BadgeInfo,
    },
    {
      id: "price",
      label: "Current Price",
      value: formatCurrency(stock.currentPrice, stock.currency || "INR"),
      description: "Latest available price",
      icon: CircleDollarSign,
    },
  ];

  return (
    <section
      className="market-summary"
      aria-labelledby="market-summary__title"
    >
      {/* 4. Section heading */}
      <h2
        id="market-summary__title"
        className="market-summary__title"
      >
        Market Summary
      </h2>

      {/* 5. Summary cards */}
      <div className="market-summary__grid">
        {summaryItems.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.id}
              className="market-summary__item"
            >
              {/* Card label and icon */}
              <div className="market-summary__item-header">
                <div className="market-summary__icon">
                  <Icon size={18} aria-hidden="true" />
                </div>

                <span className="market-summary__label">
                  {item.label}
                </span>
              </div>

              {/* Card value and description */}
              <div className="market-summary__item-content">
                <p className="market-summary__value">
                  {item.value}
                </p>

                <p className="market-summary__description">
                  {item.description}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
