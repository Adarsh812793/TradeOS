
import Table from "../../../components/ui/Table.jsx";
import HoldingRow from "./HoldingRow.jsx";
import HoldingCard from "./HoldingCard.jsx";

import "./HoldingsTable.css";

export default function HoldingsTable({ holdings }) {
  return (
    <>
      {/* Wide screens: table */}
      <Table className="holdings-table-wrapper" caption="Your holdings">
        <thead>
          <tr>
            <th>Stock</th>
            <th className="data-table__num" title="Quantity">Qty</th>
            <th className="data-table__num" title="Average buy price">Avg. Price</th>
            <th className="data-table__num" title="Current price">Price</th>
            <th className="data-table__num" title="Invested value">Invested</th>
            <th className="data-table__num" title="Current value">Value</th>
            <th className="data-table__num" title="Unrealised profit and loss">P&amp;L</th>
            <th className="data-table__num" title="Return on invested value">Returns</th>
            <th className="data-table__actions">Action</th>
          </tr>
        </thead>

        <tbody>
          {holdings.map((holding) => (
            <HoldingRow key={holding.stock._id} holding={holding} />
          ))}
        </tbody>
      </Table>

      {/* Tablets and phones: cards (the CSS shows one of the two) */}
      <div className="holdings-cards">
        {holdings.map((holding) => (
          <HoldingCard key={holding.stock._id} holding={holding} />
        ))}
      </div>
    </>
  );
}
