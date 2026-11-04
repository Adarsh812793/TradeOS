
import Card from "../../../components/ui/Card.jsx";
import { formatCompactCurrency } from "../../../utils/currency.utils.js";
import { getAllocation } from "../utils/portfolio.utils.js";

import "./PortfolioAllocation.css";

/* Donut geometry (viewBox is 120 x 120).
   Each slice is a circle whose outline is cut into a dash: stroke-dasharray = "visible gap",
   and stroke-dashoffset slides the dash around the ring to where the slice starts. */
const CENTER = 60;
const RADIUS = 45;
const STROKE_WIDTH = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SLICE_GAP = 1.5; // small space between slices

// 1, 2, 3... for stocks (matches --color-chart-N); "other" for the grouped slice
const getColorKey = (slice, index) =>
  slice.key === "others" ? "other" : index + 1;

export default function PortfolioAllocation({ holdings }) {
  const slices = getAllocation(holdings);

  if (slices.length === 0) return null;

  const totalValue = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <Card className="portfolio-allocation" padding="lg" shadow>
      <h2 className="portfolio-allocation__title">Portfolio Allocation</h2>
      <p className="portfolio-allocation__subtitle">
        Distribution of your current holdings by market value.
      </p>

      <div className="portfolio-allocation__body">
        <div className="portfolio-allocation__donut">
          <svg
            viewBox="0 0 120 120"
            role="img"
            aria-label="Donut chart of your portfolio allocation by holding"
          >
            {/* Light ring behind the slices */}
            <circle
              className="portfolio-allocation__track"
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              strokeWidth={STROKE_WIDTH}
            />

            {slices.map((slice, index) => {
              // Where this slice starts = total length of the slices before it
              const start = slices
                .slice(0, index)
                .reduce((sum, previous) => sum + previous.percent, 0);

              const length = (slice.percent / 100) * CIRCUMFERENCE;
              const visible =
                slices.length > 1 ? Math.max(length - SLICE_GAP, 0) : length;

              return (
                <circle
                  key={slice.key}
                  className={`portfolio-allocation__slice portfolio-allocation__slice--${getColorKey(
                    slice,
                    index
                  )}`}
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${visible} ${CIRCUMFERENCE - visible}`}
                  strokeDashoffset={-(start / 100) * CIRCUMFERENCE}
                  transform={`rotate(-90 ${CENTER} ${CENTER})`}
                >
                  <title>{`${slice.label}: ${slice.percent.toFixed(1)}%`}</title>
                </circle>
              );
            })}
          </svg>

          <div className="portfolio-allocation__center">
            <span className="portfolio-allocation__center-label">
              Portfolio
            </span>
            <strong className="portfolio-allocation__center-value">
              {formatCompactCurrency(totalValue)}
            </strong>
          </div>
        </div>

        {/* The legend carries the same data as text, so the chart is not colour-only */}
        <ul className="portfolio-allocation__legend">
          {slices.map((slice, index) => (
            <li key={slice.key} className="portfolio-allocation__legend-item">
              <span
                className={`portfolio-allocation__dot portfolio-allocation__dot--${getColorKey(
                  slice,
                  index
                )}`}
                aria-hidden="true"
              />
              <span className="portfolio-allocation__legend-label">
                {slice.label}
              </span>
              <span className="portfolio-allocation__legend-percent">
                {slice.percent.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
