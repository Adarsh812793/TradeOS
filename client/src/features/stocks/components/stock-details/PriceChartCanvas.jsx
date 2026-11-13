import { useEffect, useRef } from "react";
import { AreaSeries, CandlestickSeries, createChart } from "lightweight-charts";

import { readChartColors, withAlpha } from "../../utils/chartColors.js";
import {
  formatAxisTick,
  formatCandleTime,
  toCandleData,
  toLineData,
} from "../../utils/candles.utils.js";

// The drawing part of the price chart, using TradingView's Lightweight Charts. It is the ONLY file that imports the
// library and is loaded on demand by StockPriceChart, so the library never sits in the main bundle.
//   candles  the server candles to draw       mode  "area" (closing line) or "candles"
//   range    the loaded range (zoom is reset to fit when it changes)   isUp  colours the area green or red
//   onHover  called with { time, open, high, low, close } under the crosshair, or null when it leaves
export default function PriceChartCanvas({ candles, mode, range, isUp, onHover }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const colorsRef = useRef(null);
  const fittedKeyRef = useRef("");
  const onHoverRef = useRef(onHover);

  useEffect(() => {
    onHoverRef.current = onHover;
  });

  // 1. Create the chart once; it sizes itself to its box (autoSize) and is destroyed when the component goes away
  useEffect(() => {
    const colors = readChartColors();
    colorsRef.current = colors;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: colors.background },
        textColor: colors.text,
        fontFamily: colors.font,
        fontSize: 12,
        attributionLogo: true, // the TradingView credit their licence asks for
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border, timeVisible: true, secondsVisible: false },
      crosshair: {
        vertLine: { color: colors.crosshair, labelBackgroundColor: colors.labelBackground },
        horzLine: { color: colors.crosshair, labelBackgroundColor: colors.labelBackground },
      },
      localization: {
        // Everything is read in Indian time, whatever the browser's own timezone is
        timeFormatter: (time) => formatCandleTime(time, true),
      },
    });

    chart.applyOptions({
      timeScale: { tickMarkFormatter: (time, markType) => formatAxisTick(time, markType) },
    });

    // The readout above the chart follows the crosshair
    chart.subscribeCrosshairMove((param) => {
      const point = seriesRef.current && param.seriesData.get(seriesRef.current);

      if (!param.time || !point) {
        onHoverRef.current?.(null);
        return;
      }

      // The area series gives { value }; the candle series gives { open, high, low, close }
      const value = point.value ?? point.close;

      onHoverRef.current?.({
        time: param.time,
        open: point.open ?? value,
        high: point.high ?? value,
        low: point.low ?? value,
        close: value,
      });
    });

    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // 2. Draw the candles. A new series is made when the style or the colour changes; the zoom resets to fit only
  // when the range or style changes (not on the quiet 30 s refresh, so a user who zoomed in keeps their view)
  useEffect(() => {
    const chart = chartRef.current;
    const colors = colorsRef.current;

    if (!chart || !colors) return undefined;

    const priceFormat = { type: "price", precision: 2, minMove: 0.05 };
    const lineColor = isUp ? colors.up : colors.down;

    const series =
      mode === "candles"
        ? chart.addSeries(CandlestickSeries, {
            upColor: colors.up,
            borderUpColor: colors.up,
            wickUpColor: colors.up,
            downColor: colors.down,
            borderDownColor: colors.down,
            wickDownColor: colors.down,
            priceFormat,
          })
        : chart.addSeries(AreaSeries, {
            lineColor,
            lineWidth: 2,
            topColor: withAlpha(lineColor, 0.28),
            bottomColor: withAlpha(lineColor, 0),
            priceFormat,
          });

    seriesRef.current = series;
    series.setData(mode === "candles" ? toCandleData(candles) : toLineData(candles));

    const fitKey = `${range}|${mode}`;

    if (fittedKeyRef.current !== fitKey) {
      chart.timeScale().fitContent();
      fittedKeyRef.current = fitKey;
    }

    return () => {
      chart.removeSeries(series);
      seriesRef.current = null;
    };
  }, [candles, mode, range, isUp]);

  return (
    <div
      ref={containerRef}
      className="price-chart__canvas"
      role="img"
      aria-label={`Price chart, ${range} range, ${mode === "candles" ? "candlesticks" : "area"}`}
    />
  );
}
