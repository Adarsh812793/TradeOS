import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import {
  formatSignedCurrency,
  formatSignedPercent,
  getPnlTone,
} from "../../utils/change.utils.js";
import "./PriceChange.css";

// The one way to show profit, loss or a price move: +₹1,700.00 (+7.23%) in green, -₹250.00 (-2.10%) in red,
// grey at zero. The sign is always part of the text, so colour is never the only signal.
// Pass `amount`, `percent` or both; `arrow` adds a small up / down arrow.
export default function PriceChange({
  amount, // the change in money (e.g. unrealised profit)
  percent, // the change in percent
  currency = "INR",
  arrow = false,
  className = "",
}) {
  const hasAmount = amount !== undefined && amount !== null;
  const hasPercent = percent !== undefined && percent !== null;

  // The tone follows the amount when there is one, otherwise the percent
  const tone = getPnlTone(hasAmount ? amount : percent);

  const text = [
    hasAmount ? formatSignedCurrency(amount, currency) : "",
    hasPercent
      ? hasAmount
        ? `(${formatSignedPercent(percent)})`
        : formatSignedPercent(percent)
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={`price-change price-change--${tone} ${className}`.trim()}>
      {arrow && tone === "profit" && <ArrowUpRight size={14} aria-hidden="true" />}
      {arrow && tone === "loss" && <ArrowDownRight size={14} aria-hidden="true" />}
      {text}
    </span>
  );
}
