import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import DataCard from "../../../components/ui/DataCard.jsx";

import { formatCurrency } from "../../../utils/currency.utils.js";
import { formatDateTime } from "../../../utils/date.utils.js";

// Phone version of an Orders table row, built on the shared DataCard
export default function OrderCard({ order, onViewDetails }) {
  const stock = order.stockId;
  const currency = stock?.currency || "INR";

  return (
    <DataCard
      title={stock?.symbol || "—"}
      subtitle={stock?.companyName || "Unknown company"}
      badge={<Badge variant={order.type === "BUY" ? "success" : "danger"}>{order.type}</Badge>}
      items={[
        { label: "Quantity", value: order.quantity },
        { label: "Price", value: formatCurrency(order.price, currency) },
        { label: "Total value", value: formatCurrency(order.totalValue, currency), wide: true },
      ]}
      footer={
        <>
          <span className="data-card__meta">
            <Badge variant="success">{order.status}</Badge>
            <span className="data-card__date">{formatDateTime(order.createdAt)}</span>
          </span>

          <Button variant="secondary" size="sm" onClick={() => onViewDetails(order)}>
            Details
          </Button>
        </>
      }
    />
  );
}
