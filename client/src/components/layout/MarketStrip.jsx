import useMarketIndices from "../../features/market/useMarketIndices.js";
import PriceChange from "../ui/PriceChange.jsx";
import { formatNumber } from "../../utils/number.utils.js";
import "./MarketStrip.css";

// "2:35 PM", for the "as of" time of a delayed quote
function formatClock(isoDate) {
  return new Date(isoDate).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).toUpperCase();
}

// NIFTY 50 and SENSEX in the top bar. When there is no data (not loaded yet, or FYERS is unavailable) it shows nothing
// at all, with no error message. A quote that is only an EARLIER one is shown dimmed and labelled "Delayed", never as live.
export default function MarketStrip() {
  const { indices, status } = useMarketIndices();

  if (status !== "ready") return null;

  return (
    <ul className="market-strip" aria-label="Market indices">
      {indices.map((index) => (
        <li
          key={index.name}
          className={`market-strip__item ${
            index.stale ? "market-strip__item--stale" : ""
          }`}
          title={index.stale ? `Delayed: last updated at ${formatClock(index.asOf)}` : undefined}
        >
          <span className="market-strip__name">{index.name}</span>
          <span className="market-strip__price">{formatNumber(index.lastPrice)}</span>
          <PriceChange percent={index.changePercent} arrow />

          {index.stale && (
            <span className="market-strip__delayed">
              Delayed · {formatClock(index.asOf)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
