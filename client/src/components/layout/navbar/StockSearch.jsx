
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, TrendingUp, ArrowRight } from "lucide-react";

import useClickOutside from "../hooks/useClickOutside.js";
import useStockSearch from "./useStockSearch.js";
import { matchesStockSearch } from "../../../features/stocks/utils/stockFilters.utils.js";
import { formatCurrency } from "../../../utils/currency.utils.js";
import "./StockSearch.css";

// How many results the dropdown shows (with and without a typed query)
const MAX_RESULTS = 6;

// Global navbar search: finds a stock from the database by symbol or company name
// and opens its details page. Supports mouse, touch and keyboard (arrows, Enter, "/" or Ctrl+K to focus).
// Enter with no result highlighted opens the Stocks page instead (filtered by what was typed).
export default function StockSearch({
  isOpen,
  onOpen,
  onClose,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1); // -1 = nothing highlighted yet

  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { stocks, loading, error, retry } = useStockSearch(isOpen);

  useClickOutside(searchRef, isOpen, onClose);

  // Keyboard shortcut: "/" or Ctrl/Cmd+K focuses the search from anywhere.
  useEffect(() => {
    function handleShortcut(event) {
      const isTypingField = ["INPUT", "TEXTAREA", "SELECT"].includes(
        event.target.tagName
      ) || event.target.isContentEditable;

      const isSlash = event.key === "/" && !isTypingField;
      const isCtrlK =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

      if (isSlash || isCtrlK) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  // Results shown in the dropdown (all stocks when the query is empty)
  const results = useMemo(
    () =>
      stocks
        .filter((stock) => matchesStockSearch(stock, searchQuery))
        .slice(0, MAX_RESULTS),
    [stocks, searchQuery]
  );

  const query = searchQuery.trim();
  const hasStocks = stocks.length > 0;
  const safeActiveIndex = Math.min(activeIndex, results.length - 1); // stays -1 when nothing is highlighted

  // Where "see all" leads: the Stocks page, filtered by the typed text when there is any
  const stocksPagePath = query
    ? `/stocks?search=${encodeURIComponent(query)}`
    : "/stocks";

  // Open the chosen stock's details page and reset the search box.
  function handleStockSelect(stock) {
    setSearchQuery("");
    setActiveIndex(-1);
    onClose();
    inputRef.current?.blur();
    navigate(`/stocks/${stock._id}`);
  }

  // Open the Stocks page (filtered by the typed text) and reset the search box.
  function handleSeeAll() {
    setSearchQuery("");
    setActiveIndex(-1);
    onClose();
    inputRef.current?.blur();
    navigate(stocksPagePath);
  }

  function handleClearSearch() {
    setSearchQuery("");
    setActiveIndex(-1);
    inputRef.current?.focus();
    onOpen();
  }

  // Arrow keys move the highlight; Enter opens the highlighted stock, or the Stocks page when nothing is highlighted.
  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) onOpen();
      setActiveIndex(
        results.length ? (safeActiveIndex + 1) % results.length : -1
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        results.length
          ? safeActiveIndex < 0
            ? results.length - 1
            : (safeActiveIndex - 1 + results.length) % results.length
          : -1
      );
    } else if (event.key === "Enter") {
      event.preventDefault();

      if (results[safeActiveIndex]) {
        handleStockSelect(results[safeActiveIndex]);
      } else {
        handleSeeAll();
      }
    }
  }

  const activeOptionId = results[safeActiveIndex]
    ? `navbar-stock-option-${results[safeActiveIndex]._id}`
    : undefined;

  return (
    <div className="navbar__search-section" ref={searchRef}>
      {/* Search Input */}
      <div className="navbar__search">
        <Search
          className="navbar__search-icon"
          size={18}
          aria-hidden="true"
        />

        <input
          ref={inputRef}
          className="navbar__search-input"
          type="search"
          placeholder="Search stocks by name or symbol..."
          aria-label="Search stocks"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="navbar-stock-results"
          aria-activedescendant={isOpen ? activeOptionId : undefined}
          autoComplete="off"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setActiveIndex(-1);
            onOpen();
          }}
          onFocus={onOpen}
          onKeyDown={handleKeyDown}
        />

        {searchQuery && (
          <button
            type="button"
            className="navbar__search-clear"
            aria-label="Clear stock search"
            onClick={handleClearSearch}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}

        <kbd className="navbar__search-shortcut" aria-hidden="true">/</kbd>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          className="navbar__search-dropdown"
          id="navbar-stock-results"
          role="listbox"
          aria-label="Stock search results"
        >
          <div className="navbar__dropdown-heading">
            <span>{query ? "Search results" : "Stocks"}</span>
            <TrendingUp size={16} aria-hidden="true" />
          </div>

          {/* Loading: only when there is nothing to show yet */}
          {loading && !hasStocks && (
            <p className="navbar__search-status" role="status">
              Loading stocks...
            </p>
          )}

          {/* Error: only when the list could not be loaded at all */}
          {error && !hasStocks && (
            <div className="navbar__search-status navbar__search-status--error">
              <p>{error}</p>
              <button
                type="button"
                className="navbar__search-retry"
                onClick={retry}
              >
                Try again
              </button>
            </div>
          )}

          {hasStocks &&
            results.map((stock, index) => (
              <button
                type="button"
                className={`navbar__stock-result ${
                  index === safeActiveIndex
                    ? "navbar__stock-result--active"
                    : ""
                }`}
                key={stock._id}
                id={`navbar-stock-option-${stock._id}`}
                role="option"
                aria-selected={index === safeActiveIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleStockSelect(stock)}
              >
                <span className="navbar__stock-info">
                  <span className="navbar__stock-symbol">
                    {stock.symbol}
                  </span>
                  <span className="navbar__stock-name">
                    {stock.companyName}
                  </span>
                </span>

                <span className="navbar__stock-price">
                  <span>{formatCurrency(stock.currentPrice, stock.currency)}</span>
                  <span className="navbar__stock-exchange">
                    {stock.exchange}
                  </span>
                </span>
              </button>
            ))}

          {hasStocks && results.length === 0 && (
            <p className="navbar__empty-result">
              No stocks found for "{query}".
            </p>
          )}

          <Link
            to={stocksPagePath}
            className="navbar__search-footer"
            onClick={() => {
              setSearchQuery("");
              setActiveIndex(-1);
              onClose();
              inputRef.current?.blur();
            }}
          >
            <span>
              {query ? `See all results for "${query}"` : "Browse all stocks"}
            </span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
