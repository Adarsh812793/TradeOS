
import Badge from "../../../components/ui/Badge.jsx";

import { formatCurrency } from "../../../utils/currency.utils.js";
import { formatDateTime } from "../../../utils/date.utils.js";
import {
  formatSignedAmount,
  getTypeBadgeVariant,
} from "../utils/transactions.utils.js";

// One row of the desktop table. Styles live in TransactionsTable.css.
export default function TransactionRow({ transaction }) {
  const stock = transaction.stockId;
  const currency = stock?.currency || "INR";

  return (
    <tr>
      <td className="transactions-table__date">
        {formatDateTime(transaction.executedAt)}
      </td>

      <td>
        <div className="transaction-stock">
          <span className="transaction-stock__symbol">
            {stock?.symbol ?? "—"}
          </span>

          <span className="transaction-stock__name">
            {stock?.companyName ?? "Unknown stock"}
          </span>
        </div>
      </td>

      <td>
        <Badge variant={getTypeBadgeVariant(transaction.type)}>
          {transaction.type}
        </Badge>
      </td>

      <td className="transactions-table__num">{transaction.quantity}</td>

      <td className="transactions-table__num">
        {formatCurrency(transaction.executionPrice, currency)}
      </td>

      <td className="transactions-table__num transactions-table__amount">
        {formatSignedAmount(transaction.type, transaction.totalValue, currency)}
      </td>
    </tr>
  );
}
