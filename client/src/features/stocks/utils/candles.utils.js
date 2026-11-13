// Small pure helpers that turn the server's candles into what the chart and the page header need.
// A server candle is { time (ISO string), open, high, low, close, synthetic }.

// The chart library wants time as whole seconds since 1970 (UTC).
export function toChartTime(isoTime) {
  return Math.floor(new Date(isoTime).getTime() / 1000);
}

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

// Chart times are UTC seconds, but Indian markets are read in IST, so every label is formatted for Asia/Kolkata.
const IST = "Asia/Kolkata";

const dateFormat = new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric" });
const dayMonthFormat = new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short" });
const monthFormat = new Intl.DateTimeFormat("en-IN", { timeZone: IST, month: "short" });
const yearFormat = new Intl.DateTimeFormat("en-IN", { timeZone: IST, year: "numeric" });
const clockFormat = new Intl.DateTimeFormat("en-IN", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false });

// "3 Nov 2026", or "3 Nov 2026, 10:15" when `withTime` (for the crosshair readout and notes).
export function formatCandleTime(seconds, withTime = false) {
  const date = new Date(seconds * 1000);

  return withTime ? `${dateFormat.format(date)}, ${clockFormat.format(date)}` : dateFormat.format(date);
}

// The short labels along the bottom axis. `markType` is the library's tick kind: 0 year, 1 month, 2 day, 3+ time.
export function formatAxisTick(seconds, markType) {
  const date = new Date(seconds * 1000);

  if (markType === 0) return yearFormat.format(date);
  if (markType === 1) return monthFormat.format(date);
  if (markType === 2) return dayMonthFormat.format(date);

  return clockFormat.format(date);
}

// "past month", "today" ... the words after the range change in the chart header.
export const RANGE_PHRASES = {
  "1D": "today",
  "1W": "past week",
  "1M": "past month",
  "3M": "past 3 months",
  "1Y": "past year",
  ALL: "all time",
};
