
import { useEffect, useState } from "react";
import { getMarketIndices } from "../dashboard.api.js";
import { formatCurrency } from "../../../utils/currency.utils.js";
import "./MarketOverview.css";

/* 2. Format Quote Timestamp */
function formatQuoteTime(timestamp) {
    if (!timestamp) return "Time unavailable";

    return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(new Date(timestamp * 1000));
}

/* 3. Market Overview Component */
export default function MarketOverview() {
    const [indices, setIndices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Changing this number re-runs the effect below, which reloads the indices (Refresh / retry buttons)
    const [refreshKey, setRefreshKey] = useState(0);

    /* 3.1 Load the indices when the component mounts and whenever refreshKey changes */
    useEffect(() => {
        // Prevents state updates after the component has been left
        let isMounted = true;

        // Fetches the indices and fills the list (or the error message)
        async function loadIndices() {
            setLoading(true);
            setError("");

            try {
                const result = await getMarketIndices();

                if (!isMounted) return;

                setIndices(result.indices ?? []);

                if (!result.success) {
                    setError("Market data could not be loaded.");
                } else if (result.indices?.length === 0) {
                    setError("No market data is currently available.");
                }
            } catch (err) {
                if (!isMounted) return;

                setError(err.message || "Failed to load market data.");
                setIndices([]);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadIndices();

        return () => {
            isMounted = false;
        };
    }, [refreshKey]);

    // 3.2 Asks for a fresh load (used by the Refresh and retry buttons)
    function handleRefresh() {
        setRefreshKey((key) => key + 1);
    }

    /* 3.3 Render Market Overview */
    return (
        <section className="market-overview">
            <div className="market-overview__header">
                <div>
                    <h2 className="market-overview__title">
                        Market Overview
                    </h2>
                    <p className="market-overview__subtitle">
                        Indian market indices
                    </p>
                </div>

                <button
                    className="market-overview__refresh"
                    type="button"
                    onClick={handleRefresh}
                    disabled={loading}
                >
                    {loading ? "Loading..." : "↻ Refresh"}
                </button>
            </div>

            {loading && indices.length === 0 ? (
                <div className="market-overview__status">
                    Fetching market data...
                </div>
            ) : error && indices.length === 0 ? (
                <div className="market-overview__status market-overview__status--error">
                    <p>{error}</p>
                    <button type="button" onClick={handleRefresh}>
                        Try again
                    </button>
                </div>
            ) : (
                <>
                    {error && (
                        <p className="market-overview__notice">
                            {error}
                        </p>
                    )}

                    <div className="market-overview__grid">
                        {indices.map((index) => {
                            const isPositive = index.change >= 0;

                            return (
                                <article
                                    className="market-card"
                                    key={index.symbol}
                                >
                                    <div className="market-card__top">
                                        <div>
                                            <h3 className="market-card__name">
                                                {index.name}
                                            </h3>
                                            <p className="market-card__exchange">
                                                {index.exchange}
                                            </p>
                                        </div>

                                        <span className="market-card__symbol">
                                            {index.exchange === "NSE"
                                                ? "NSE"
                                                : "BSE"}
                                        </span>
                                    </div>

                                    <p className="market-card__price">
                                        {formatCurrency(index.lastPrice)}
                                    </p>

                                    <div
                                        className={`market-card__change ${
                                            isPositive
                                                ? "market-card__change--positive"
                                                : "market-card__change--negative"
                                        }`}
                                    >
                                        <span>
                                            {isPositive ? "▲" : "▼"}
                                        </span>
                                        <span>
                                            {formatCurrency(
                                                Math.abs(index.change)
                                            )}
                                        </span>
                                        <span>
                                            ({isPositive ? "+" : ""}
                                            {index.changePercent?.toFixed(2)}%)
                                        </span>
                                        <span className="market-card__period">
                                            Today
                                        </span>
                                    </div>

                                    <div className="market-card__footer">
                                        <span>Last quote</span>
                                        <span>
                                            {formatQuoteTime(
                                                index.quoteTimestamp
                                            )}
                                        </span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </>
            )}
        </section>
    );
}
