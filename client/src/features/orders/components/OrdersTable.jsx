
import Table from "../../../components/ui/Table.jsx";
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
        <Table caption="Your orders">
          <thead>
            <tr>
              <th>#</th>
              <th>Stock</th>
              <th>Type</th>
              <th className="data-table__num">Quantity</th>
              <th className="data-table__num">Price</th>
              <th className="data-table__num">Total Value</th>
              <th>Status</th>
              <th>Date &amp; Time</th>
              <th className="data-table__actions">Actions</th>
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
        </Table>
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
