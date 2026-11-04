import { useState } from "react";

import useOrders from "../features/orders/hooks/useOrders.js";

import OrdersHeader from "../features/orders/components/OrdersHeader.jsx";
import OrdersTable from "../features/orders/components/OrdersTable.jsx";

import EmptyState from "../components/ui/EmptyState.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import Modal from "../components/ui/Modal.jsx";

import { formatCurrency } from "../utils/currency.utils.js";
import { formatDateTime } from "../utils/date.utils.js";

import "./OrdersPage.css";

export default function OrdersPage() {
  const {
    orders,
    pagination,
    loading,
    error,
    changePage,
  } = useOrders();

  const [selectedOrder, setSelectedOrder] = useState(null);

  if (loading) {
    return (
      <section className="orders-page">
        <p>Loading your orders...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="orders-page">
        <p className="orders-page__error">{error}</p>
      </section>
    );
  }

  return (
    <section className="orders-page">
      <OrdersHeader totalItems={pagination.totalItems} />

      {orders.length === 0 ? (
        <EmptyState
          icon="orders"
          title="No orders yet"
          description="Your executed orders will appear here once you start trading."
        />
      ) : (
        <>
          <OrdersTable
            orders={orders}
            page={pagination.page}
            limit={pagination.limit}
            onViewDetails={setSelectedOrder}
          />

          {/* Pagination component will be added here */}
        </>
      )}

      <Pagination
        pagination={pagination}
        onPageChange={changePage}
        itemLabel="orders"
      />

      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title="Order Details"
      >
        {selectedOrder && (
          <div className="order-details">
            <p>
              <strong>Stock:</strong>{" "}
              {selectedOrder.stockId?.symbol}
            </p>

            <p>
              <strong>Company:</strong>{" "}
              {selectedOrder.stockId?.companyName}
            </p>

            <p>
              <strong>Order Type:</strong>{" "}
              {selectedOrder.type}
            </p>

            <p>
              <strong>Quantity:</strong>{" "}
              {selectedOrder.quantity}
            </p>

            <p>
              <strong>Price:</strong>{" "}
              {formatCurrency(
                selectedOrder.price,
                selectedOrder.stockId?.currency || "INR"
              )}
            </p>

            <p>
              <strong>Total Value:</strong>{" "}
              {formatCurrency(
                selectedOrder.totalValue,
                selectedOrder.stockId?.currency || "INR"
              )}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {selectedOrder.status}
            </p>

            <p>
              <strong>Date:</strong>{" "}
              {formatDateTime(selectedOrder.createdAt)}
            </p>
          </div>
        )}
      </Modal>
    </section>
  );
}