// Helpers shared by every chart in the app (the stock price chart and the account value chart): theme colours for the
// canvas and the date labels, which are always read in Indian time.

// The chart draws on a canvas, which cannot read CSS variables, so this reads the theme tokens (styles/tokens.css)
// once and hands plain colour strings to the chart. No colour is ever written in JavaScript.

// "#3DDCA0" + 0.25 -> "rgba(61, 220, 160, 0.25)" (the chart library cannot parse the tokens' modern rgb() syntax).
export function withAlpha(hex, alpha) {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

// The colours and font a chart needs, taken from the current theme.
export function readChartColors() {
  const tokens = getComputedStyle(document.documentElement);
  const token = (name) => tokens.getPropertyValue(name).trim();

  return {
    up: token("--color-success"),
    down: token("--color-danger"),
    text: token("--color-text-secondary"),
    grid: token("--color-border-subtle"),
    border: token("--color-border"),
    crosshair: token("--color-text-muted"),
    labelBackground: token("--color-surface-raised"),
    background: token("--color-surface"),
    font: token("--font-mono"),
  };
}

// The chart library wants time as whole seconds since 1970 (UTC); the server sends ISO strings.
export function toChartTime(isoTime) {
  return Math.floor(new Date(isoTime).getTime() / 1000);
}

// Chart times are UTC seconds, but Indian markets are read in IST, so every label is formatted for Asia/Kolkata.
const IST = "Asia/Kolkata";

const dateFormat = new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric" });
const dayMonthFormat = new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short" });
const monthFormat = new Intl.DateTimeFormat("en-IN", { timeZone: IST, month: "short" });
const yearFormat = new Intl.DateTimeFormat("en-IN", { timeZone: IST, year: "numeric" });
const clockFormat = new Intl.DateTimeFormat("en-IN", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false });

// "3 Nov 2026", or "3 Nov 2026, 10:15" when `withTime` (for the crosshair readout and notes).
export function formatChartTime(seconds, withTime = false) {
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

// "past month", "today" ... the words after the range change in a chart header.
export const RANGE_PHRASES = {
  "1D": "today",
  "1W": "past week",
  "1M": "past month",
  "3M": "past 3 months",
  "1Y": "past year",
  ALL: "all time",
};
