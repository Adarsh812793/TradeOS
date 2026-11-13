
import { useNavigate } from "react-router-dom";

import HoldingStock from "./HoldingStock.jsx";
import HoldingActions from "./HoldingActions.jsx";

import PriceChange from "../../../components/ui/PriceChange.jsx";
import { formatCurrency } from "../../../utils/currency.utils.js";
import { handleRowClick } from "../../../components/ui/rowClick.js";

export default function HoldingRow({ holding }) {
  const { stock } = holding;
  const navigate = useNavigate();

  return (
    <tr
      className="is-clickable-row"
      onClick={(event) => handleRowClick(event, navigate, `/stocks/${stock._id}`)}
    >
      <td>
        <HoldingStock stock={stock} />
      </td>

      <td className="data-table__num">{holding.quantity}</td>

      <td className="data-table__num">
        {formatCurrency(holding.averageBuyPrice)}
      </td>

      <td className="data-table__num">
        {formatCurrency(holding.currentPrice)}
      </td>

      <td className="data-table__num">
        {formatCurrency(holding.investedValue)}
      </td>

      <td className="data-table__num holding-value">
        {formatCurrency(holding.currentValue)}
      </td>

      <td className="data-table__num">
        <PriceChange amount={holding.unrealizedPnL} />
      </td>

      <td className="data-table__num">
        <PriceChange percent={holding.pnlPercentage} />
      </td>

      <td className="data-table__actions">
        <HoldingActions stock={stock} />
      </td>
    </tr>
  );
}
