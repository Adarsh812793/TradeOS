import { useState } from "react";
import "./StockPriceChart.css";

const timeRanges = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

export default function PriceChart() {
  const [selectedRange, setSelectedRange] = useState("1D");

  return (
    <section className="price-chart">
      {/* Header */}
      <div className="price-chart__header">
        <h2>Price Chart</h2>

        <button
          type="button"
          className="price-chart__advanced-btn"
          disabled
          title="Advanced chart will be available later"
        >
          Advanced Chart ↗
        </button>
      </div>

      {/* Time range selectors */}
      <div className="price-chart__ranges">
        {timeRanges.map((range) => (
          <button
            key={range}
            type="button"
            className={
              selectedRange === range
                ? "price-chart__range active"
                : "price-chart__range"
            }
            onClick={() => setSelectedRange(range)}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Empty chart state */}
      <div className="price-chart__empty">
        <div className="price-chart__empty-icon">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 4 4 5-7" />
          </svg>
        </div>

        <h3>Historical price data not connected yet</h3>

        <p>
          We'll integrate historical price data soon to show
          interactive charts with detailed price movements.
        </p>
      </div>
    </section>
  );
}