import { useEffect, useState } from "react";

import stocksApi from "../../stocks.api.js";
import useVisiblePolling from "../../../../hooks/useVisiblePolling.js";
import Badge from "../../../../components/ui/Badge.jsx";
import PriceChange from "../../../../components/ui/PriceChange.jsx";
import SegmentedControl from "../../../../components/ui/SegmentedControl.jsx";
import Skeleton, { SkeletonRegion } from "../../../../components/ui/Skeleton.jsx";
import Table from "../../../../components/ui/Table.jsx";
import { formatCurrency } from "../../../../utils/currency.utils.js";
import { formatDateTime } from "../../../../utils/date.utils.js";
import "./StockPositionOrders.css";

const TABS = [
  { value: "position", label: "Position" },
  { value: "orders", label: "Recent orders" },
];

// "Your holding" panel of the stock page: what the user owns of this stock (quantity, cost, value, profit or loss)
// and their latest orders for it. Reloads quietly every 30 s so the profit follows the price.
export default function StockPositionOrders({ stock }) {
  const [activeTab, setActiveTab] = useState("position");
  const [position, setPosition] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchStockPosition() {
      try {
        setLoading(true);
        setError("");

        const response = await stocksApi.getStockPosition(stock._id);

        if (!isMounted) return;

        setPosition(response.data.position);
        setRecentOrders(response.data.recentOrders);
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to fetch stock position.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchStockPosition();

    return () => {
      isMounted = false;
    };
  }, [stock._id]);

  // Profit and loss follow the price: a quiet reload (no skeleton; a failure keeps the old figures)
  useVisiblePolling(async () => {
    try {
      const response = await stocksApi.getStockPosition(stock._id);
      setPosition(response.data.position);
      setRecentOrders(response.data.recentOrders);
    } catch {
      /* keep showing the figures we have */
    }
  });

  const money = (value) => formatCurrency(value, stock.currency);

  return (
    <section className="stock-position" aria-label="Your holding">
      <div className="stock-position__header">
        <h2 className="stock-position__title">Your holding</h2>

        <SegmentedControl
          label="Holding view"
          size="sm"
          value={activeTab}
          onChange={setActiveTab}
          options={TABS}
        />
      </div>

      {loading ? (
        <SkeletonRegion label="Loading your holding">
          <div className="stock-position__grid">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} height={40} />
            ))}
          </div>
        </SkeletonRegion>
      ) : error ? (
        <p className="stock-position__message stock-position__message--error" role="alert">
          {error}
        </p>
      ) : activeTab === "position" ? (
        position?.quantity > 0 ? (
          <dl className="stock-position__grid">
            <Figure label="Quantity" value={position.quantity} />
            <Figure label="Avg. buy price" value={money(position.averageBuyPrice)} />
            <Figure label="Current price" value={money(position.currentPrice)} />
            <Figure label="Invested" value={money(position.investedValue)} />
            <Figure label="Current value" value={money(position.currentValue)} />
            <Figure
              label="Profit / loss"
              value={
                <PriceChange
                  amount={position.profitLoss}
                  percent={position.profitLossPercentage}
                  currency={stock.currency}
                />
              }
            />
          </dl>
        ) : (
          <p className="stock-position__message">
            You don&apos;t hold any shares of {stock.symbol}.
          </p>
        )
      ) : recentOrders.length > 0 ? (
        <Table caption={`Recent ${stock.symbol} orders`} minWidth={460}>
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col" className="data-table__num">
                Quantity
              </th>
              <th scope="col" className="data-table__num">
                Price
              </th>
              <th scope="col">Date</th>
            </tr>
          </thead>

          <tbody>
            {recentOrders.map((order) => (
              <tr key={order._id}>
                <td>
                  <Badge variant={order.type === "BUY" ? "success" : "danger"}>
                    {order.type}
                  </Badge>
                </td>
                <td className="data-table__num">{order.quantity}</td>
                <td className="data-table__num">{money(order.price)}</td>
                <td>{formatDateTime(order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="stock-position__message">No recent orders for {stock.symbol}.</p>
      )}
    </section>
  );
}

// One label and value pair of the holding grid
function Figure({ label, value }) {
  return (
    <div className="stock-position__figure">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
