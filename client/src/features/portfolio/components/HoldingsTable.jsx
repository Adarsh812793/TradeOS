
import HoldingRow from "./HoldingRow.jsx";
import HoldingCard from "./HoldingCard.jsx";

import "./HoldingsTable.css";

export default function HoldingsTable({ holdings }) {
  return (
    <>
      {/* Wide screens: table */}
      <div className="holdings-table-wrapper">
        <table className="holdings-table">
          <thead>
            <tr>
              <th>Stock</th>
              <th className="holdings-table__num">Quantity</th>
              <th className="holdings-table__num">Avg. Buy Price</th>
              <th className="holdings-table__num">Current Price</th>
              <th className="holdings-table__num">Invested Value</th>
              <th className="holdings-table__num">Current Value</th>
              <th className="holdings-table__num">P&amp;L</th>
              <th className="holdings-table__num">Returns %</th>
              <th className="holdings-table__actions">Action</th>
            </tr>
          </thead>

          <tbody>
            {holdings.map((holding) => (
              <HoldingRow key={holding.stock._id} holding={holding} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Tablets and phones: cards (the CSS shows one of the two) */}
      <div className="holdings-cards">
        {holdings.map((holding) => (
          <HoldingCard key={holding.stock._id} holding={holding} />
        ))}
      </div>
    </>
  );
}
