import Table from "../../../components/ui/Table.jsx";
import TransactionRow from "./TransactionRow.jsx";
import TransactionCard from "./TransactionCard.jsx";

import "./TransactionsTable.css";

// The ledger: the shared Table on wide screens, shared DataCards below 1000px (the CSS shows one of the two)
export default function TransactionsTable({ transactions }) {
  return (
    <>
      {/* Wide screens: table */}
      <Table className="transactions-table-wrapper" caption="Your transactions">
        <thead>
          <tr>
            <th scope="col">Date &amp; time</th>
            <th scope="col">Stock</th>
            <th scope="col">Type</th>
            <th scope="col" className="data-table__num">Quantity</th>
            <th scope="col" className="data-table__num">Price</th>
            <th scope="col" className="data-table__num">Amount</th>
          </tr>
        </thead>

        <tbody>
          {transactions.map((transaction) => (
            <TransactionRow key={transaction._id} transaction={transaction} />
          ))}
        </tbody>
      </Table>

      {/* Tablets and phones: cards */}
      <div className="transactions-cards">
        {transactions.map((transaction) => (
          <TransactionCard key={transaction._id} transaction={transaction} />
        ))}
      </div>
    </>
  );
}
