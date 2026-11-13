// Small pure helpers that turn the server's candles into what the chart and the page header need.
// A server candle is { time (ISO string), open, high, low, close, synthetic }.

import { toChartTime } from "../../../utils/chart.utils.js";

// Candles in the shape of the candlestick series: { time, open, high, low, close }.
export function toCandleData(candles) {
  return candles.map(({ time, open, high, low, close }) => ({
    time: toChartTime(time),
    open,
    high,
    low,
    close,
  }));
}

// Closing prices in the shape of the area (line) series: { time, value }.
export function toLineData(candles) {
  return candles.map(({ time, close }) => ({
    time: toChartTime(time),
    value: close,
  }));
}

// How much the price moved over the candles shown: from the first candle's open to the last close.
// Returns { amount, percent } or null when there is nothing to compare.
export function getRangeChange(candles) {
  if (!candles || candles.length === 0) return null;

  const start = candles[0].open;
  const end = candles[candles.length - 1].close;

  if (!start) return null;

  const amount = Math.round((end - start) * 100) / 100;
  const percent = Math.round(((end - start) / start) * 10000) / 100;

  return { amount, percent };
}

// The time of the first candle built from live prices (not generated history), or null when all are generated.
// The chart uses it to say "prices before this date are generated history".
export function getFirstLiveTime(candles) {
  const firstLive = candles?.find((candle) => !candle.synthetic);

  return firstLive ? firstLive.time : null;
}

// True when at least one candle shown is generated history, so the chart should say so.
export function hasSyntheticCandles(candles) {
  return Boolean(candles?.some((candle) => candle.synthetic));
}
