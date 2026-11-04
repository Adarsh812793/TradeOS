
import HoldingStock from "./HoldingStock.jsx";
import HoldingActions from "./HoldingActions.jsx";

import { formatCurrency } from "../../../utils/currency.utils.js";
import {
  formatSignedCurrency,
  formatSignedPercent,
  getPnlTone,
} from "../utils/portfolio.utils.js";

export default function HoldingRow({ holding }) {
  const { stock } = holding;

  return (
    <tr>
      <td>
        <HoldingStock stock={stock} />
      </td>

      <td className="holdings-table__num">{holding.quantity}</td>

      <td className="holdings-table__num">
        {formatCurrency(holding.averageBuyPrice)}
      </td>

      <td className="holdings-table__num">
        {formatCurrency(holding.currentPrice)}
      </td>

      <td className="holdings-table__num">
        {formatCurrency(holding.investedValue)}
      </td>

      <td className="holdings-table__num holding-value">
        {formatCurrency(holding.currentValue)}
      </td>

      <td
        className={`holdings-table__num holding-pnl holding-pnl--${getPnlTone(
          holding.unrealizedPnL
        )}`}
      >
        {formatSignedCurrency(holding.unrealizedPnL)}
      </td>

      <td
        className={`holdings-table__num holding-pnl holding-pnl--${getPnlTone(
          holding.pnlPercentage
        )}`}
      >
        {formatSignedPercent(holding.pnlPercentage)}
      </td>

      <td className="holdings-table__actions">
        <HoldingActions stock={stock} />
      </td>
    </tr>
  );
}
