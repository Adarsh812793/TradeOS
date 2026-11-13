import { useEffect, useRef } from "react";
import { AreaSeries, CandlestickSeries, createChart } from "lightweight-charts";

import { formatAxisTick, formatChartTime, readChartColors, withAlpha } from "../../utils/chart.utils.js";

// The shared chart: TradingView's Lightweight Charts drawing one value over time, as an area line or as candlesticks.
// It is the ONLY file that imports the library (the stock price chart and the account value chart both use it), so
// pages must load it on demand with React.lazy and the library never sits in the main bundle.
//   kind       "area": data is [{ time, value }]        "candles": data is [{ time, open, high, low, close }]
//              (time is whole UTC seconds; labels are always shown in Indian time)
//   isUp       colours the area green (true) or red (false); candles colour themselves
//   fitKey     the chart zooms to fit all the data when this text changes (a new range or style), but NOT on the
//              quiet refresh, so a user who zoomed in keeps their view
//   priceFormat  how the right-hand scale prints numbers (default: rupees and paise on a 5-paise tick)
//   onHover    called with { time, ...the point under the crosshair } ({ value } or { open, high, low, close }),
//              or null when the crosshair leaves
// A module constant, not an inline default: the value is an effect dependency below, and a fresh object on every
// render would rebuild the series on every render (for example on every crosshair move)
const DEFAULT_PRICE_FORMAT = { type: "price", precision: 2, minMove: 0.05 };

export default function TimeSeriesChart({
  kind,
  data,
  isUp = true,
  fitKey,
  priceFormat = DEFAULT_PRICE_FORMAT,
  onHover,
  className = "",
  ariaLabel,
}) {
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
        timeFormatter: (time) => formatChartTime(time, true),
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

      onHoverRef.current?.({ ...point, time: param.time });
    });

    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // 2. Draw the data. A new series is made when the kind, the colour or the data changes
  useEffect(() => {
    const chart = chartRef.current;
    const colors = colorsRef.current;

    if (!chart || !colors) return undefined;

    const lineColor = isUp ? colors.up : colors.down;

    const series =
      kind === "candles"
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
    series.setData(data);

    if (fittedKeyRef.current !== fitKey) {
      chart.timeScale().fitContent();
      fittedKeyRef.current = fitKey;
    }

    return () => {
      chart.removeSeries(series);
      seriesRef.current = null;
    };
  }, [data, kind, isUp, fitKey, priceFormat]);

  return <div ref={containerRef} className={className} role="img" aria-label={ariaLabel} />;
}
