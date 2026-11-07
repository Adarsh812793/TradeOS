import { useEffect, useState } from "react";

import stocksApi from "../../stocks.api.js";
import useVisiblePolling from "../../../../hooks/useVisiblePolling.js";

import { formatCurrency } from "../../../../utils/currency.utils.js";
import "./StockPositionOrders.css";

const tabs = ["Your Position", "Recent Orders"];

export default function StockPositionDetails({ stock }) {
    const [activeTab, setActiveTab] = useState("Your Position");

    const [position, setPosition] = useState(null);
    const [recentOrders, setRecentOrders] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        const fetchStockPosition = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await stocksApi.getStockPosition(stock._id);

                if (!isMounted) return;

                setPosition(response.data.position);
                setRecentOrders(response.data.recentOrders);
            } catch (err) {
                if (!isMounted) return;

                setError(
                    err.message || "Failed to fetch stock position."
                );
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchStockPosition();

        return () => {
            isMounted = false;
        };
    }, [stock._id]);

    // Profit and loss follow the price: reload quietly every 30 s (no Loading flash; a failure keeps the old figures)
    useVisiblePolling(async () => {
        try {
            const response = await stocksApi.getStockPosition(stock._id);
            setPosition(response.data.position);
            setRecentOrders(response.data.recentOrders);
        } catch {
            /* keep showing the figures we have */
        }
    });

    if (loading) {
        return (
            <section className="stock-position-details">
                <p>Loading position details...</p>
            </section>
        );
    }

    if (error) {
        return (
            <section className="stock-position-details">
                <p className="position-error">{error}</p>
            </section>
        );
    }

    return (
        <section className="stock-position-details">
            <div className="position-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        className={
                            activeTab === tab ? "active" : ""
                        }
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === "Your Position" && (
                <div className="position-content">
                    {position?.quantity > 0 ? (
                        <div className="position-grid">
                            <div>
                                <span>Quantity</span>
                                <strong>{position.quantity}</strong>
                            </div>

                            <div>
                                <span>Avg. Buy Price</span>
                                <strong>
                                    {formatCurrency(
                                        position.averageBuyPrice,
                                        stock.currency
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>Current Price</span>
                                <strong>
                                    {formatCurrency(
                                        position.currentPrice,
                                        stock.currency
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>Invested Value</span>
                                <strong>
                                    {formatCurrency(
                                        position.investedValue,
                                        stock.currency
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>Current Value</span>
                                <strong>
                                    {formatCurrency(
                                        position.currentValue,
                                        stock.currency
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>P&L</span>
                                <strong
                                    className={
                                        position.profitLoss >= 0
                                            ? "profit"
                                            : "loss"
                                    }
                                >
                                    {formatCurrency(
                                        position.profitLoss,
                                        stock.currency
                                    )}
                                    {" "}
                                    ({position.profitLossPercentage.toFixed(2)}%)
                                </strong>
                            </div>
                        </div>
                    ) : (
                        <p className="position-empty">
                            You don't hold any shares of {stock.symbol}.
                        </p>
                    )}
                </div>
            )}

            {activeTab === "Recent Orders" && (
                <div className="recent-orders-content">
                    {recentOrders.length > 0 ? (
                        <div className="orders-table-wrapper">
                            <table className="orders-table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Quantity</th>
                                        <th>Price</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {recentOrders.map((order) => (
                                        <tr key={order._id}>
                                            <td>
                                                <span
                                                    className={
                                                        order.type === "BUY"
                                                            ? "buy"
                                                            : "sell"
                                                    }
                                                >
                                                    {order.type}
                                                </span>
                                            </td>

                                            <td>{order.quantity}</td>

                                            <td>
                                                {formatCurrency(
                                                    order.price,
                                                    stock.currency
                                                )}
                                            </td>

                                            <td>{order.status}</td>

                                            <td>
                                                {new Date(
                                                    order.createdAt
                                                ).toLocaleDateString("en-IN")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="position-empty">
                            No recent orders for {stock.symbol}.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}