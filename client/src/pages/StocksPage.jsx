
import { useEffect, useState,useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import stocksApi from "../features/stocks/stocks.api.js";
import useWatchlistToggle from "../features/watchlist/hooks/useWatchlistToggle.js";
import StockFilters from "../features/stocks/components/StockFilters.jsx";
import StockTable from "../features/stocks/components/StockTable.jsx";
import StockCard from "../features/stocks/components/StockCard.jsx";
import StockPagination from "../features/stocks/components/StockPagination.jsx";
import {filterAndSortStocks}from "../features/stocks/utils/stockFilters.utils.js"
import {paginateItems,getTotalPages,} from "../features/stocks/utils/pagination.utils.js";

import "./StocksPage.css";

// 1. Stocks page component
export default function StocksPage() {
  // 2. State management

  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search, exchange filter, and sorting state
  // The search text lives in the URL (?search=...), so the navbar search can open this page already filtered
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get("search") ?? "";

  // Updates the ?search= value (removes it when empty); replace keeps typing out of the back-button history
  function setSearchTerm(value) {
    setSearchParams(value ? { search: value } : {}, { replace: true });
  }

  const [selectedExchange, setSelectedExchange] = useState("all");
  const [sortBy, setSortBy] = useState("symbol-asc");

  // Current Page and items per page :Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // fixed page size (nothing changes it)

  // Watchlist: which stocks are saved, and add / remove
  const {
    isSaved,
    isBusy,
    toggleWatchlist,
    error: watchlistError,
  } = useWatchlistToggle();

  // 3. Fetch stocks when the page mounts
  useEffect(() => {
    let isMounted = true;

    async function fetchStocks() {
      try {
        setLoading(true);
        setError("");

        const response = await stocksApi.getAllStocks();

        if (isMounted) {
          setStocks(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load stocks.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStocks();

    // Cleanup
    return () => {
      isMounted = false;
    };
  }, []);

  // 4. Get unique exchanges from the fetched stocks->NSE,BSE
  const exchanges = [...new Set(stocks.map((stock) => stock.exchange))];

  //5. Calculationg all filteres stocks
  const filteredStocks = useMemo(() => {
  
    //Expensive work
    return filterAndSortStocks(stocks,searchTerm,selectedExchange,sortBy)

  }, [stocks, searchTerm, selectedExchange, sortBy]);

  // 6. Calculation of paginated stocks
  const totalPages = getTotalPages(filteredStocks.length,itemsPerPage);
  //Get stocks for the current page
  const paginatedStocks = useMemo(() => {
    return paginateItems(
      filteredStocks,
      currentPage,
      itemsPerPage
    );
  }, [filteredStocks, currentPage, itemsPerPage]);

  // 7. Go back to page 1 when the search text or exchange changes. This also covers the navbar search, which
  // changes ?search= from outside this page. React allows setting state while rendering when it is guarded
  // like this: it re-renders at once, so the wrong page is never shown (an effect would show it for one frame).
  const filterKey = `${searchTerm}|${selectedExchange}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);

  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setCurrentPage(1);
  }

  // 8. Render the page
return (
  <main className="stocks-page">
    {/* 1. Page heading */}
    <header className="stocks-page__header">
      <h1>Explore Stocks</h1>
      <p>Browse and discover available stocks.</p>
    </header>

    {/* 2. Search and filter controls */}
    {!loading && !error && (
      <StockFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedExchange={selectedExchange}
        onExchangeChange={setSelectedExchange}
        sortBy={sortBy}
        onSortChange={setSortBy}
        exchanges={exchanges}
      />
    )}

    {/* Watchlist problems (failed to load / update) */}
    {watchlistError && (
      <p className="stocks-page__error" role="alert">
        {watchlistError}
      </p>
    )}

    {/* 3. Loading state */}
    {loading ? (
      <p className="stocks-page__status" role="status">
        Loading stocks...
      </p>
    ) : error ? (
      <p className="stocks-page__error" role="alert">
        {error}
      </p>
    ) : (
      <>
        {/* 4. Desktop: stock table */}
        <div className="stocks-page__desktop">
          <StockTable
            stocks={paginatedStocks}
            isSaved={isSaved}
            isBusy={isBusy}
            onToggleWatchlist={toggleWatchlist}
          />
        </div>

        {/* 5. Mobile: stock cards */}
        <div className="stocks-page__mobile">
          {stocks.length === 0 ? (
            <p className="stocks-page__status" role="status">
              No stocks are available right now.
            </p>
          ) : (
            paginatedStocks.map((stock) => (
              <StockCard
                key={stock._id}
                stock={stock}
                isSaved={isSaved(stock._id)}
                isPending={isBusy(stock._id)}
                onToggleWatchlist={toggleWatchlist}
              />
            ))
          )}
        </div>

        {/* 6. Pagination */}
        <StockPagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={filteredStocks.length}
          onPageChange={setCurrentPage}
        />
      </>
    )}
  </main>
);

}
