import Badge from "../../../components/ui/Badge.jsx";
import DataCard from "../../../components/ui/DataCard.jsx";

import { formatCurrency } from "../../../utils/currency.utils.js";
import { formatDateTime } from "../../../utils/date.utils.js";
import {
  formatSignedAmount,
  getAmountTone,
  getTypeBadgeVariant,
} from "../utils/transactions.utils.js";

// Phone version of a Transactions table row, built on the shared DataCard
export default function TransactionCard({ transaction }) {
  const stock = transaction.stockId;
  const currency = stock?.currency || "INR";

  return (
    <DataCard
      title={stock?.symbol ?? "—"}
      subtitle={stock?.companyName ?? "Unknown stock"}
      badge={<Badge variant={getTypeBadgeVariant(transaction.type)}>{transaction.type}</Badge>}
      items={[
        { label: "Quantity", value: transaction.quantity },
        { label: "Price", value: formatCurrency(transaction.executionPrice, currency) },
        {
          label: "Amount",
          value: formatSignedAmount(transaction.type, transaction.totalValue, currency),
          tone: getAmountTone(transaction.type),
          wide: true,
        },
      ]}
      footer={<span className="data-card__date">{formatDateTime(transaction.executedAt)}</span>}
    />
  );
}
