
import OrderRow from "./OrderRow.jsx";
import OrderCard from "./OrderCard.jsx";

import "./OrdersTable.css";

export default function OrdersTable({
  orders,
  page,
  limit,
  onViewDetails,
}) {
  return (
    <div className="orders-table-wrapper">
      {/* Desktop table */}
      <div className="orders-table-desktop">
        <table className="orders-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Stock</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total Value</th>
              <th>Status</th>
              <th>Date &amp; Time</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order, index) => (
              <OrderRow
                key={order._id}
                order={order}
                index={(page - 1) * limit + index + 1}
                onViewDetails={onViewDetails}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="orders-table-mobile">
        {orders.map((order) => (
          <OrderCard
            key={order._id}
            order={order}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
}
