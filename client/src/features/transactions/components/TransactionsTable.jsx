
import TransactionRow from "./TransactionRow.jsx";
import TransactionCard from "./TransactionCard.jsx";

import "./TransactionsTable.css";

export default function TransactionsTable({ transactions }) {
  return (
    <>
      {/* Wide screens: table */}
      <div className="transactions-table-wrapper">
        <table className="transactions-table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Stock</th>
              <th>Type</th>
              <th className="transactions-table__num">Quantity</th>
              <th className="transactions-table__num">Price</th>
              <th className="transactions-table__num">Amount</th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((transaction) => (
              <TransactionRow key={transaction._id} transaction={transaction} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Tablets and phones: cards (the CSS shows one of the two) */}
      <div className="transactions-cards">
        {transactions.map((transaction) => (
          <TransactionCard key={transaction._id} transaction={transaction} />
        ))}
      </div>
    </>
  );
}
