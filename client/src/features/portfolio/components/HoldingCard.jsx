
import { useNavigate } from "react-router-dom";

import Badge from "../../../components/ui/Badge.jsx";
import { handleRowClick } from "../../../components/ui/rowClick.js";
import PriceChange from "../../../components/ui/PriceChange.jsx";
import HoldingStock from "./HoldingStock.jsx";
import HoldingActions from "./HoldingActions.jsx";

import { formatCurrency } from "../../../utils/currency.utils.js";
import {
  formatSignedPercent,
  getPnlTone,
} from "../../../utils/change.utils.js";

import "./HoldingCard.css";

// Badge only knows success / danger / neutral
const TONE_TO_BADGE = {
  profit: "success",
  loss: "danger",
  neutral: "neutral",
};

// Mobile / tablet version of a table row. Shared styles (avatar, P&L colours,
// Buy/Sell links) live in HoldingsTable.css, which loads with the table.
export default function HoldingCard({ holding }) {
  const { stock } = holding;
  const navigate = useNavigate();

  const returnsTone = getPnlTone(holding.pnlPercentage);

  const details = [
    { label: "Quantity", value: holding.quantity },
    { label: "Avg. Buy Price", value: formatCurrency(holding.averageBuyPrice) },
    { label: "Current Price", value: formatCurrency(holding.currentPrice) },
    { label: "Invested Value", value: formatCurrency(holding.investedValue) },
    { label: "Current Value", value: formatCurrency(holding.currentValue) },
    {
      label: "P&L",
      value: <PriceChange amount={holding.unrealizedPnL} />,
    },
  ];

  return (
    <article
      className="holding-card is-clickable-row"
      onClick={(event) => handleRowClick(event, navigate, `/stocks/${stock._id}`)}
    >
      <div className="holding-card__header">
        <HoldingStock stock={stock} />

        <Badge variant={TONE_TO_BADGE[returnsTone]}>
          {formatSignedPercent(holding.pnlPercentage)}
        </Badge>
      </div>

      <div className="holding-card__details">
        {details.map(({ label, value }) => (
          <div className="holding-card__item" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <HoldingActions stock={stock} />
    </article>
  );
}
