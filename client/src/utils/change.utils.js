// Helpers for showing a change in value (profit and loss, price moves): the sign, the colour tone and the text.
import { formatCurrency } from "./currency.utils.js";

// Rounds to 2 decimals first so tiny values like -0.001 show as 0.00, not -0.00
function roundToTwoDecimals(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

// Used to pick the profit / loss / neutral colour
export function getPnlTone(value) {
  const rounded = roundToTwoDecimals(value);

  if (rounded > 0) return "profit";
  if (rounded < 0) return "loss";
  return "neutral";
}

// +₹1,700.00 / -₹250.00 / ₹0.00
export function formatSignedCurrency(value, currency = "INR") {
  const rounded = roundToTwoDecimals(value);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";

  return `${sign}${formatCurrency(Math.abs(rounded), currency)}`;
}

// +7.23% / -2.10% / 0.00%
export function formatSignedPercent(value) {
  const rounded = roundToTwoDecimals(value);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";

  return `${sign}${Math.abs(rounded).toFixed(2)}%`;
}
