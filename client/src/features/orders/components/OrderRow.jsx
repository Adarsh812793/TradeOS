import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";


import { formatCurrency } from "../../../utils/currency.utils.js";
import { formatDateTime } from "../../../utils/date.utils.js";

export default function OrderRow({ order, index, onViewDetails }) {
  const stock = order.stockId;

  const typeVariant =
    order.type === "BUY" ? "success" : "danger";

  return (
    <tr>
      <td>{index}</td>

      <td>
        <div className="order-stock">
          <span className="order-stock__symbol">
            {stock?.symbol ?? "—"}
          </span>

          <span className="order-stock__name">
            {stock?.companyName ?? "Unknown stock"}
          </span>
        </div>
      </td>

      <td>
        <Badge variant={typeVariant}>
          {order.type}
        </Badge>
      </td>

      <td className="data-table__num">{order.quantity}</td>

      <td className="data-table__num order-price">
        {formatCurrency(order.price, stock?.currency || "INR")}
      </td>

      <td className="data-table__num order-price">
        {formatCurrency(order.totalValue, stock?.currency || "INR")}
      </td>

      <td>
        <Badge variant="success">
          {order.status}
        </Badge>
      </td>

      <td>{formatDateTime(order.createdAt)}</td>

      <td className="data-table__actions">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onViewDetails(order)}
        >
          Details
        </Button>
      </td>
    </tr>
  );
}