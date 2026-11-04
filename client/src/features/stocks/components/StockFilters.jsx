
import { Search } from "lucide-react";

import "./StockFilters.css";

// 1. Stock filters component
export default function StockFilters({
  searchTerm,
  onSearchChange,
  selectedExchange,
  onExchangeChange,
  sortBy,
  onSortChange,
  exchanges,
}) {
  return (
    <section className="stock-filters">
      {/* 2. Search by stock symbol or company name */}
      <div className="stock-filters__search">
        <Search
          size={18}
          className="stock-filters__search-icon"
          aria-hidden="true"
        />

        <input
          type="search"
          name="stock-search"
          className="stock-filters__search-input"
          placeholder="Search by company name or symbol..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search stocks by company name or symbol"
        />
      </div>

      {/* 3. Filter by exchange */}
      <div className="stock-filters__field">
        <label htmlFor="stock-exchange">Exchange</label>

        <select
          id="stock-exchange"
          value={selectedExchange}
          onChange={(event) => onExchangeChange(event.target.value)}
          className="stock-filters__select"
        >
          <option value="all">All Exchanges</option>

          {exchanges.map((exchange) => (
            <option key={exchange} value={exchange}>
              {exchange}
            </option>
          ))}
        </select>
      </div>

      {/* 4. Sort stocks */}
      <div className="stock-filters__field">
        <label htmlFor="stock-sort">Sort by</label>

        <select
          id="stock-sort"
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value)}
          className="stock-filters__select"
        >
          <option value="symbol-asc">Symbol (A–Z)</option>
          <option value="symbol-desc">Symbol (Z–A)</option>
          <option value="price-asc">Price (Low–High)</option>
          <option value="price-desc">Price (High–Low)</option>
        </select>
      </div>
    </section>
  );
}
