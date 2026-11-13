import { useMemo } from "react";

import TimeSeriesChart from "../../../../components/charts/TimeSeriesChart.jsx";
import { toCandleData, toLineData } from "../../utils/candles.utils.js";

// The stock price chart's drawing part, loaded on demand by StockPriceChart. It turns the server candles into chart data
// and lets the shared TimeSeriesChart draw them.
//   candles  the server candles to draw       mode  "area" (closing line) or "candles"
//   range    the loaded range (zoom is reset to fit when it changes)   isUp  colours the area green or red
//   onHover  called with { time, open, high, low, close } under the crosshair, or null when it leaves
export default function PriceChartCanvas({ candles, mode, range, isUp, onHover }) {
  const data = useMemo(
    () => (mode === "candles" ? toCandleData(candles) : toLineData(candles)),
    [candles, mode]
  );

  // The readout always shows all four values (an area point has only a price, which stands for all of them)
  const handleHover = (point) => {
    if (!point) {
      onHover(null);
      return;
    }

    const value = point.value ?? point.close;

    onHover({
      time: point.time,
      open: point.open ?? value,
      high: point.high ?? value,
      low: point.low ?? value,
      close: value,
    });
  };

  return (
    <TimeSeriesChart
      kind={mode}
      data={data}
      isUp={isUp}
      fitKey={`${range}|${mode}`}
      onHover={handleHover}
      className="price-chart__canvas"
      ariaLabel={`Price chart, ${range} range, ${mode === "candles" ? "candlesticks" : "area"}`}
    />
  );
}
