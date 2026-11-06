
import HoldingStock from "./HoldingStock.jsx";
import HoldingActions from "./HoldingActions.jsx";

import PriceChange from "../../../components/ui/PriceChange.jsx";
import { formatCurrency } from "../../../utils/currency.utils.js";

export default function HoldingRow({ holding }) {
  const { stock } = holding;

  return (
    <tr>
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
