
import Badge from "../../../components/ui/Badge.jsx";

import { formatCurrency } from "../../../utils/currency.utils.js";
import { formatDateTime } from "../../../utils/date.utils.js";
import {
  formatSignedAmount,
  getTypeBadgeVariant,
} from "../utils/transactions.utils.js";

import "./TransactionCard.css";

// Tablet / phone version of a table row
export default function TransactionCard({ transaction }) {
  const stock = transaction.stockId;
  const currency = stock?.currency || "INR";

  return (
    <article className="transaction-card">
      <div className="transaction-card__header">
        <div className="transaction-card__stock">
          <h3 className="transaction-card__symbol">{stock?.symbol ?? "—"}</h3>

          <p className="transaction-card__company">
            {stock?.companyName ?? "Unknown stock"}
          </p>
        </div>

        <Badge variant={getTypeBadgeVariant(transaction.type)}>
          {transaction.type}
        </Badge>
      </div>

      <div className="transaction-card__details">
        <div className="transaction-card__item">
          <span>Quantity</span>
          <strong>{transaction.quantity}</strong>
        </div>

        <div className="transaction-card__item">
          <span>Price</span>
          <strong>{formatCurrency(transaction.executionPrice, currency)}</strong>
        </div>

        <div className="transaction-card__item transaction-card__item--wide">
          <span>Amount</span>
          <strong>
            {formatSignedAmount(transaction.type, transaction.totalValue, currency)}
          </strong>
        </div>
      </div>

      <p className="transaction-card__date">
        {formatDateTime(transaction.executedAt)}
      </p>
    </article>
  );
}
