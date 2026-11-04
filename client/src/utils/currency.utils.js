// Formats a number as currency with Indian digit grouping, e.g. ₹1,25,430.00
export function formatCurrency(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

// Short form for tight spaces, e.g. ₹1.25L or ₹12.50Cr
export function formatCompactCurrency(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}
