import { lazy, Suspense, useState } from "react";
import { Info } from "lucide-react";

import Button from "../../../../components/ui/Button.jsx";
import PriceChange from "../../../../components/ui/PriceChange.jsx";
import SegmentedControl from "../../../../components/ui/SegmentedControl.jsx";
import Skeleton from "../../../../components/ui/Skeleton.jsx";
import { formatCurrency } from "../../../../utils/currency.utils.js";
import useCandles from "../../hooks/useCandles.js";
import {
  RANGE_PHRASES,
  formatCandleTime,
  getFirstLiveTime,
  getRangeChange,
  hasSyntheticCandles,
  toChartTime,
} from "../../utils/candles.utils.js";
import "./StockPriceChart.css";

// The chart code (and the charting library) downloads only when a stock page opens, in its own file
const PriceChartCanvas = lazy(() => import("./PriceChartCanvas.jsx"));

const RANGES = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

const STYLES = [
  { value: "area", label: "Area" },
  { value: "candles", label: "Candles" },
];

// The price chart card of the stock page: the range's change, an Area / Candles switch, the 1D...ALL ranges, a
// readout that follows the crosshair, and a note when part of the history is generated.
export default function StockPriceChart({ stock }) {
  const [range, setRange] = useState("1M");
  const [mode, setMode] = useState("area");
  const [hover, setHover] = useState(null); // the point under the crosshair, or null

  const { data, loading, error, retry } = useCandles(stock._id, range);

  const candles = data?.candles ?? [];
  const change = getRangeChange(candles);
  const isUp = !change || change.amount >= 0;
  const last = candles[candles.length - 1];

  // The readout shows the hovered point, or the newest candle when the pointer is away
  const shown = hover ?? (last && { ...last, time: toChartTime(last.time) });

  const firstLive = getFirstLiveTime(candles);
  const hasGenerated = hasSyntheticCandles(candles);

  return (
    <section className="price-chart" aria-label="Price chart">
      <div className="price-chart__header">
        <div>
          <h2 className="price-chart__title">Price</h2>

          {change && (
            <p className="price-chart__change">
              <PriceChange
                amount={change.amount}
                percent={change.percent}
                currency={stock.currency}
                arrow
              />
              <span className="price-chart__phrase">{RANGE_PHRASES[data.range]}</span>
            </p>
          )}
        </div>

        <div className="price-chart__controls">
          <SegmentedControl
            label="Chart style"
            size="sm"
            value={mode}
            onChange={setMode}
            options={STYLES}
          />
          <SegmentedControl
            label="Time range"
            size="sm"
            value={range}
            onChange={setRange}
            options={RANGES.map((value) => ({ value, label: value }))}
          />
        </div>
      </div>

      {/* The readout: date, then open / high / low / close (or just the price in area style) */}
      <p className="price-chart__readout" aria-live="off">
        {shown ? (
          <>
            <span className="price-chart__readout-time">
              {formatCandleTime(shown.time, data.interval === "5m")}
            </span>
            {mode === "candles" ? (
              <>
                <span>O {formatCurrency(shown.open, stock.currency)}</span>
                <span>H {formatCurrency(shown.high, stock.currency)}</span>
                <span>L {formatCurrency(shown.low, stock.currency)}</span>
                <span>C {formatCurrency(shown.close, stock.currency)}</span>
              </>
            ) : (
              <span>{formatCurrency(shown.close, stock.currency)}</span>
            )}
          </>
        ) : (
          <span>&nbsp;</span>
        )}
      </p>

      {/* The chart area: loading, error and empty states keep the same height, so nothing jumps */}
      <div className={`price-chart__body ${loading && data ? "price-chart__body--loading" : ""}`}>
        {error && !data ? (
          <div className="price-chart__message" role="alert">
            <p>{error}</p>
            <Button variant="secondary" size="sm" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : !data ? (
          <Skeleton height="100%" radius="var(--radius-md)" />
        ) : candles.length === 0 ? (
          <div className="price-chart__message" role="status">
            <p>There is no price history for this range yet.</p>
          </div>
        ) : (
          <Suspense fallback={<Skeleton height="100%" radius="var(--radius-md)" />}>
            <PriceChartCanvas
              candles={candles}
              mode={mode}
              range={data.range}
              isUp={isUp}
              onHover={setHover}
            />
          </Suspense>
        )}
      </div>

      <p className="price-chart__note">
        <Info size={14} aria-hidden="true" />
        <span>
          {hasGenerated
            ? firstLive
              ? `Prices before ${formatCandleTime(toChartTime(firstLive))} are generated history; live simulated prices start there.`
              : "These prices are generated history, not real market data."
            : "Prices are simulated, not real market data."}{" "}
          Chart by{" "}
          <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">
            TradingView Lightweight Charts™
          </a>
          .
        </span>
      </p>
    </section>
  );
}
