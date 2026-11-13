import { useState } from "react";
import { useNavigate } from "react-router-dom";

import useOrders from "../features/orders/hooks/useOrders.js";

import PageHeader from "../components/layout/PageHeader.jsx";
import OrdersTable from "../features/orders/components/OrdersTable.jsx";
import OrderDetails from "../features/orders/components/OrderDetails.jsx";

import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import Modal from "../components/ui/Modal.jsx";
import { SkeletonHeading, SkeletonRegion, SkeletonTable } from "../components/ui/Skeleton.jsx";

import "./OrdersPage.css";

// The Orders page: every executed order, 8 per page. A page change keeps the current rows on screen (dimmed) until the
// next ones arrive; a failed page change keeps them and shows the error above.
export default function OrdersPage() {
  const navigate = useNavigate();

  const { orders, pagination, loading, error, changePage, retry } = useOrders();

  const [selectedOrder, setSelectedOrder] = useState(null);

  const hasNothingToShow = orders.length === 0;

  // First load
  if (hasNothingToShow && loading) {
    return (
      <section className="orders-page">
        <SkeletonRegion label="Loading your orders">
          <SkeletonHeading />
          <SkeletonTable columns={9} rows={6} cardsBelow={768} />
        </SkeletonRegion>
      </section>
    );
  }

  // Nothing to show and the load failed
  if (hasNothingToShow && error) {
    return (
      <section className="orders-page">
        <div className="orders-page__error orders-page__error--blocking" role="alert">
          <p>{error}</p>

          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="orders-page">
      <PageHeader
        title="My Orders"
        subtitle="View and track all your buy and sell orders"
        aside={`${pagination.totalItems} ${pagination.totalItems === 1 ? "order" : "orders"}`}
      />

      {/* A failed page change keeps the old rows and shows this above them */}
      {error && (
        <p className="orders-page__error" role="alert">
          {error}
        </p>
      )}

      {hasNothingToShow ? (
        <EmptyState
          icon="orders"
          title="No orders yet"
          description="Your executed orders will appear here once you start trading."
          actionLabel="Explore stocks"
          onAction={() => navigate("/stocks")}
        />
      ) : (
        <div
          className={`orders-page__content ${loading ? "orders-page__content--busy" : ""}`}
          aria-busy={loading}
        >
          <OrdersTable
            orders={orders}
            page={pagination.page}
            limit={pagination.limit}
            onViewDetails={setSelectedOrder}
          />

          <Pagination pagination={pagination} onPageChange={changePage} itemLabel="orders" />
        </div>
      )}

      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title="Order details"
      >
        {selectedOrder && <OrderDetails order={selectedOrder} />}
      </Modal>
    </section>
  );
}
