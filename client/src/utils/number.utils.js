// Formats a plain number (not money) with Indian digit grouping, e.g. 24,812.40. Used for index levels.
export function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value ?? 0);
}
