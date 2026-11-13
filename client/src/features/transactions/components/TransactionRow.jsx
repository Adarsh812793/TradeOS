import Badge from "../../../components/ui/Badge.jsx";

import { formatCurrency } from "../../../utils/currency.utils.js";
import { formatDateTime } from "../../../utils/date.utils.js";
import {
  formatSignedAmount,
  getAmountTone,
  getTypeBadgeVariant,
} from "../utils/transactions.utils.js";

// One row of the desktop table (the shared Table's cell classes: data-table__num for numbers)
export default function TransactionRow({ transaction }) {
  const stock = transaction.stockId;
  const currency = stock?.currency || "INR";

  return (
    <tr>
      <td>{formatDateTime(transaction.executedAt)}</td>

      <td>
        <div className="transaction-stock">
          <span className="transaction-stock__symbol">{stock?.symbol ?? "—"}</span>
          <span className="transaction-stock__name">{stock?.companyName ?? "Unknown stock"}</span>
        </div>
      </td>

      <td>
        <Badge variant={getTypeBadgeVariant(transaction.type)}>{transaction.type}</Badge>
      </td>

      <td className="data-table__num">{transaction.quantity}</td>

      <td className="data-table__num">{formatCurrency(transaction.executionPrice, currency)}</td>

      <td
        className={`data-table__num transactions-table__amount transactions-table__amount--${getAmountTone(transaction.type)}`}
      >
        {formatSignedAmount(transaction.type, transaction.totalValue, currency)}
      </td>
    </tr>
  );
}
