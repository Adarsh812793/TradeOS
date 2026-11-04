// 1. Imports
import { useEffect, useState,useCallback,useRef} from "react";
import { useParams, useSearchParams } from "react-router-dom";

import stocksApi from "../features/stocks/stocks.api.js";
import {createBuyOrder,createSellOrder,} from "../features/orders/orders.api.js";
import watchlistApi from "../features/watchlist/watchlist.api.js";
import useNotifications from "../features/notifications/useNotifications.js";

import StockHeader from "../features/stocks/components/stock-details/StockHeader.jsx";
import MarketSummary from "../features/stocks/components/stock-details/MarketSummary.jsx";
import PlaceOrderCard from "../features/stocks/components/stock-details/PlaceOrderCard.jsx";
import StockPriceChart from "../features/stocks/components/stock-details/StockPriceChart.jsx"
import CompanyInfo from "../features/stocks/components/stock-details/CompanyInfo.jsx";
import StockPositionOrders from "../features/stocks/components/stock-details/StockPositionOrders.jsx";

import "./StockDetailsPage.css"

// 2. Page component
export default function StockDetailsPage() {
  // 3. Get stock ID from the URL
  const { stockId } = useParams();
  const [searchParams] = useSearchParams(); // ?action=sell opens the page on the Sell form
  const orderCardRef = useRef(null);
  const { refresh: refreshNotifications } = useNotifications(); // an order creates a notification: update the bell now

  // 4. Stock state
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  //Orders associated states
  const [selectedOrderType, setSelectedOrderType] = useState(
    searchParams.get("action") === "sell" ? "sell" : "buy"
  );
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState("");

  //watchlist associated state variables
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(false);
  const [watchlistError, setWatchlistError] = useState("");

  // 5. Fetch selected stock
  useEffect(() => {
    let isMounted = true;

    async function fetchStock() {
      try {
        setLoading(true);
        setError("");

        const response = await stocksApi.getStockById(stockId);

        if (isMounted) {
          setStock(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load stock details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStock();

    return () => {
      isMounted = false;
    };
  }, [stockId]);

  useEffect(() => {
    let isMounted = true;

    async function checkWatchlist() {
      try {
        setWatchlistError("");

        const response = await watchlistApi.getUserWatchlist();

        // Adjust this line to your actual response structure.
        const watchlist = response.data;

        const exists = watchlist.some((entry) => {
          const watchlistStockId =
            typeof entry.stockId === "object"
              ? entry.stockId._id
              : entry.stockId;

          return watchlistStockId === stockId;
        });

        if (isMounted) {
          setIsInWatchlist(exists);
        }
      } catch (error) {
        if (isMounted) {
          setWatchlistError(
            error.message || "Unable to load watchlist status."
          );
        }
      }
    }

    if (stockId) {
      checkWatchlist();
    }

    return () => {
      isMounted = false;
    };
  }, [stockId]);

  //function to handle placing orders
  const handlePlaceOrder = useCallback(
    async ({ stockId, quantity, orderType }) => {
      setIsSubmittingOrder(true);
      setOrderSuccess("");

      try {
        const createOrder =
          orderType === "buy" ? createBuyOrder : createSellOrder;

        const response = await createOrder({
          stockId,
          quantity,
        });

        setOrderSuccess(
          response?.message || `${orderType} order placed successfully.`
        );

        refreshNotifications();

        return response;
      } finally {
        setIsSubmittingOrder(false);
      }
    },
    [refreshNotifications]
  );

  //function to handle event when buy,sell btns are clicked
  const handleHeaderTradeAction = useCallback((orderType) => {
    setSelectedOrderType(orderType);

    orderCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, []);

  //function to handle watchlist toggle
  const handleWatchlistToggle = useCallback(async () => {
    if (!stock?._id || isWatchlistLoading) return;

    setIsWatchlistLoading(true);
    setWatchlistError("");

    try {
      if (isInWatchlist) {
        await watchlistApi.removeFromWatchlist(stock._id);
        setIsInWatchlist(false);
      } else {
        await watchlistApi.addToWatchlist(stock._id);
        setIsInWatchlist(true);
      }
    } catch (error) {
      setWatchlistError(error.message || "Unable to update watchlist.");
    } finally {
      setIsWatchlistLoading(false);
    }
  }, [stock, isInWatchlist, isWatchlistLoading]);

  // 6. Loading state
  if (loading) {
    return <p>Loading stock details...</p>;
  }

  // 7. Error state
  if (error || !stock) {
    return <p>{error || "Stock not found."}</p>;
  }

  // 8. Render stock details
return (
  <div className="stock-details-page">
    {/* Stock header */}
    <section className="stock-details-page__header">
    <StockHeader
      stock={stock}
      onTradeAction={handleHeaderTradeAction}
      isInWatchlist={isInWatchlist}
      onWatchlistToggle={handleWatchlistToggle}
      isWatchlistLoading={isWatchlistLoading}
    />
    </section>

    {/* Main trading area */}
    <div className="stock-details-page__main">
      {/* Left column */}
      <div className="stock-details-page__primary">
        <MarketSummary stock={stock} />

        <StockPriceChart />

        {/* Bottom-left section */}
        <div className="stock-details-page__bottom">
          <CompanyInfo stock={stock} />

          <StockPositionOrders stock={stock} />
        </div>
      </div>

      {/* Right column */}
      <aside className="stock-details-page__sidebar"
      ref={orderCardRef}>
        <PlaceOrderCard
          stock={stock}
          selectedOrderType={selectedOrderType}
          onOrderTypeChange={setSelectedOrderType}
          onSubmit={(order) =>
            handlePlaceOrder({
              ...order,
              orderType: selectedOrderType,
            })
          }
          isSubmitting={isSubmittingOrder}
        />
      </aside>
    </div>

    {/* Watchlist problems (failed to check / update) */}
    {watchlistError && (
      <p className="stock-details-page__error" role="alert">
        {watchlistError}
      </p>
    )}

    {/* Order success message */}
    {orderSuccess && (
      <p className="stock-details-page__success">
        {orderSuccess}
      </p>
    )}
  </div>
);
}