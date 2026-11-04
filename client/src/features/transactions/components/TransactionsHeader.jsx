
import "./TransactionsHeader.css";

export default function TransactionsHeader({ totalItems = 0 }) {
  return (
    <header className="transactions-header">
      <div>
        <h1 className="transactions-header__title">Transactions</h1>
        <p className="transactions-header__subtitle">
          A ledger of every buy and sell on your account
        </p>
      </div>

      <span className="transactions-header__count">
        {totalItems} {totalItems === 1 ? "transaction" : "transactions"}
      </span>
    </header>
  );
}
