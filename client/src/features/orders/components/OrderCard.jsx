
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";

import { formatCurrency } from "../../../utils/currency.utils.js";
import { formatDateTime } from "../../../utils/date.utils.js";

import "./OrderCard.css";

export default function OrderCard({ order, onViewDetails }) {
  const stock = order.stockId;
  const currency = stock?.currency || "INR";

  return (
    <article className="order-card">
      {/* Card header */}
      <div className="order-card__header">
        <div className="order-card__stock">
          <h3 className="order-card__symbol">
            {stock?.symbol || "—"}
          </h3>

          <p className="order-card__company">
            {stock?.companyName || "Unknown company"}
          </p>
        </div>

        <Badge
          variant={order.type === "BUY" ? "success" : "danger"}
        >
          {order.type}
        </Badge>
      </div>

      {/* Order information */}
      <div className="order-card__details">
        <div className="order-card__item">
          <span>Quantity</span>
          <strong>{order.quantity}</strong>
        </div>

        <div className="order-card__item">
          <span>Price</span>
          <strong>
            {formatCurrency(order.price, currency)}
          </strong>
        </div>

        <div className="order-card__item order-card__item--total">
          <span>Total Value</span>
          <strong>
            {formatCurrency(order.totalValue, currency)}
          </strong>
        </div>
      </div>

      {/* Card footer */}
      <div className="order-card__footer">
        <div className="order-card__meta">
          <Badge variant="success">
            {order.status}
          </Badge>

          <span className="order-card__date">
            {formatDateTime(order.createdAt)}
          </span>
        </div>

        <Button
          variant="secondary"
          onClick={() => onViewDetails(order)}
        >
          Details
        </Button>
      </div>
    </article>
  );
}
