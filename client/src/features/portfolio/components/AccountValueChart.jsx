import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Info } from "lucide-react";

import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import PriceChange from "../../../components/ui/PriceChange.jsx";
import SegmentedControl from "../../../components/ui/SegmentedControl.jsx";
import Skeleton from "../../../components/ui/Skeleton.jsx";
import { formatCurrency } from "../../../utils/currency.utils.js";
import { RANGE_PHRASES, formatChartTime, toChartTime } from "../../../utils/chart.utils.js";
import usePortfolioHistory from "../hooks/usePortfolioHistory.js";
import { hasEstimatedPoints } from "../utils/portfolio.utils.js";
import "./AccountValueChart.css";

// The chart code (and the charting library) downloads only when a page with this chart opens, in its own file
const AccountValueChartCanvas = lazy(() => import("./AccountValueChartCanvas.jsx"));

const RANGES = ["1W", "1M", "3M", "1Y", "ALL"];

// The account value card (Portfolio and Dashboard): how your holdings plus your cash changed day by day, with the
// range change, 1W...ALL ranges and a readout that follows the crosshair (value, holdings and cash on that day).
export default function AccountValueChart() {
  const [range, setRange] = useState("1M");
  const [hover, setHover] = useState(null); // { time (UTC seconds), value } under the crosshair, or null

  const { data, loading, error, retry } = usePortfolioHistory(range);

  const points = useMemo(() => data?.points ?? [], [data]);

  // History point by chart time, to turn the crosshair's time back into the day's value, holdings and cash
  const pointByTime = useMemo(
    () => new Map(points.map((point) => [toChartTime(point.time), point])),
    [points]
  );

  const last = points[points.length - 1];
  const shown = (hover && pointByTime.get(hover.time)) || last;
  const hasChart = points.length >= 2;

  return (
    <Card className="account-chart" padding="lg" shadow>
      <div className="account-chart__header">
        <div>
          <h2 className="account-chart__title">Account value</h2>

          {data?.summary && hasChart ? (
            <p className="account-chart__change">
              <PriceChange
                amount={data.summary.change}
                percent={data.summary.changePercent}
                currency={data.currency}
                arrow
              />
              <span className="account-chart__phrase">{RANGE_PHRASES[data.range]}</span>
            </p>
          ) : (
            <p className="account-chart__subtitle">Your holdings plus your cash, over time.</p>
          )}
        </div>

        {data?.firstTradeAt && (
          <SegmentedControl
            label="Time range"
            size="sm"
            value={range}
            onChange={setRange}
            options={RANGES.map((value) => ({ value, label: value }))}
          />
        )}
      </div>

      {/* The readout: the day, then the account value, holdings and cash on that day */}
      {hasChart && shown && (
        <p className="account-chart__readout" aria-live="off">
          <span className="account-chart__readout-time">
            {formatChartTime(toChartTime(shown.time))}
          </span>
          <span>Value {formatCurrency(shown.totalValue, data.currency)}</span>
          <span>Holdings {formatCurrency(shown.holdingsValue, data.currency)}</span>
          <span>Cash {formatCurrency(shown.cash, data.currency)}</span>
        </p>
      )}

      {/* The chart area: every state keeps the same height, so nothing jumps */}
      <div className={`account-chart__body ${loading && data ? "account-chart__body--loading" : ""}`}>
        {error && !data ? (
          <div className="account-chart__message" role="alert">
            <p>{error}</p>
            <Button variant="secondary" size="sm" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : !data ? (
          <Skeleton height="100%" radius="var(--radius-md)" />
        ) : !data.firstTradeAt ? (
          <div className="account-chart__message" role="status">
            <p>Your account value appears here after your first trade.</p>
            <Button as={Link} to="/stocks" variant="secondary" size="sm">
              Explore stocks
            </Button>
          </div>
        ) : !hasChart ? (
          <div className="account-chart__message" role="status">
            <p>
              Your history builds up day by day.
              {last ? ` Your account is worth ${formatCurrency(last.totalValue, data.currency)} today.` : ""}
            </p>
          </div>
        ) : (
          <Suspense fallback={<Skeleton height="100%" radius="var(--radius-md)" />}>
            <AccountValueChartCanvas
              points={points}
              range={data.range}
              isUp={data.summary.change >= 0}
              onHover={setHover}
            />
          </Suspense>
        )}
      </div>

      {/* A range that failed to load while older data is still showing */}
      {error && data && (
        <p className="account-chart__alert" role="alert">
          Could not load this range. Showing earlier data.{" "}
          <button type="button" className="account-chart__link" onClick={retry}>
            Try again
          </button>
        </p>
      )}

      {hasChart && (
        <p className="account-chart__note">
          <Info size={14} aria-hidden="true" />
          <span>
            Based on simulated prices.
            {hasEstimatedPoints(points)
              ? " Where a stock had no price history yet, earlier values use the price of your own trades."
              : ""}{" "}
            Chart by{" "}
            <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">
              TradingView Lightweight Charts™
            </a>
            .
          </span>
        </p>
      )}
    </Card>
  );
}
