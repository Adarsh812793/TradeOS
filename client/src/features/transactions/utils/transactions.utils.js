
import { formatCurrency } from "../../../utils/currency.utils.js";

// Ledger style: a BUY takes money out of the wallet (-), a SELL puts money in (+)
export function formatSignedAmount(type, value, currency = "INR") {
  const sign = type === "SELL" ? "+" : "-";

  return `${sign}${formatCurrency(value, currency)}`;
}

// Same colours as the Orders page: BUY green, SELL red
export function getTypeBadgeVariant(type) {
  return type === "BUY" ? "success" : "danger";
}
