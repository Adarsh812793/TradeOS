import { useNavigate } from "react-router-dom";

import useTransactions from "../features/transactions/hooks/useTransactions.js";

import TransactionsHeader from "../features/transactions/components/TransactionsHeader.jsx";
import TransactionsTable from "../features/transactions/components/TransactionsTable.jsx";

import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { SkeletonHeading, SkeletonRegion, SkeletonTable } from "../components/ui/Skeleton.jsx";
import Pagination from "../components/ui/Pagination.jsx";

import "./TransactionsPage.css";

export default function TransactionsPage() {
  const navigate = useNavigate();

  const {
    transactions,
    pagination,
    loading,
    error,
    changePage,
    retry,
  } = useTransactions();

  const hasNothingToShow = transactions.length === 0;

  // First load (later page changes keep the current rows on screen, see below)
  if (hasNothingToShow && loading) {
    return (
      <section className="transactions-page">
        <SkeletonRegion label="Loading your transactions">
          <SkeletonHeading />
          <SkeletonTable columns={6} rows={8} cardsBelow={1000} />
        </SkeletonRegion>
      </section>
    );
  }

  if (hasNothingToShow && error) {
    return (
      <section className="transactions-page">
        <div
          className="transactions-page__error transactions-page__error--blocking"
          role="alert"
        >
          <p>{error}</p>

          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="transactions-page">
      <TransactionsHeader totalItems={pagination.totalItems} />

      {/* A failed page change keeps the old rows and shows this above them */}
      {error && (
        <p className="transactions-page__error" role="alert">
          {error}
        </p>
      )}

      {hasNothingToShow ? (
        <EmptyState
          icon="orders"
          title="No transactions yet"
          description="Every buy and sell you make will be recorded here."
          actionLabel="Explore stocks"
          onAction={() => navigate("/stocks")}
        />
      ) : (
        <div
          className={`transactions-page__content ${
            loading ? "transactions-page__content--busy" : ""
          }`}
          aria-busy={loading}
        >
          <TransactionsTable transactions={transactions} />

          <Pagination
            pagination={pagination}
            onPageChange={changePage}
            itemLabel="transactions"
          />
        </div>
      )}
    </section>
  );
}
