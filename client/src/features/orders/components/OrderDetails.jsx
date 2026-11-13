import Badge from "../../../components/ui/Badge.jsx";

import { formatCurrency } from "../../../utils/currency.utils.js";
import { formatDateTime } from "../../../utils/date.utils.js";

import "./OrderDetails.css";

// The inside of the "Order details" dialog: a label and value list of one order, with the same badges and mono
// numbers as the table.
export default function OrderDetails({ order }) {
  const stock = order.stockId;
  const currency = stock?.currency || "INR";

  return (
    <dl className="order-details">
      <div className="order-details__row">
        <dt>Stock</dt>
        <dd>
          <span className="order-details__symbol">{stock?.symbol ?? "—"}</span>
          <span className="order-details__company">{stock?.companyName ?? "Unknown stock"}</span>
        </dd>
      </div>

      <div className="order-details__row">
        <dt>Type</dt>
        <dd>
          <Badge variant={order.type === "BUY" ? "success" : "danger"}>{order.type}</Badge>
        </dd>
      </div>

      <div className="order-details__row">
        <dt>Quantity</dt>
        <dd className="order-details__number">{order.quantity}</dd>
      </div>

      <div className="order-details__row">
        <dt>Price</dt>
        <dd className="order-details__number">{formatCurrency(order.price, currency)}</dd>
      </div>

      <div className="order-details__row order-details__row--total">
        <dt>Total value</dt>
        <dd className="order-details__number">{formatCurrency(order.totalValue, currency)}</dd>
      </div>

      <div className="order-details__row">
        <dt>Status</dt>
        <dd>
          <Badge variant="success">{order.status}</Badge>
        </dd>
      </div>

      <div className="order-details__row">
        <dt>Placed</dt>
        <dd>{formatDateTime(order.createdAt)}</dd>
      </div>
    </dl>
  );
}
