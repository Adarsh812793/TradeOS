
import { Search } from "lucide-react";

import Select from "../../../components/ui/Select.jsx";

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
      <Select
        className="stock-filters__field"
        label="Exchange"
        id="stock-exchange"
        value={selectedExchange}
        onChange={onExchangeChange}
        options={[
          { value: "all", label: "All Exchanges" },
          ...exchanges.map((exchange) => ({ value: exchange, label: exchange })),
        ]}
      />

      {/* 4. Sort stocks */}
      <Select
        className="stock-filters__field"
        label="Sort by"
        id="stock-sort"
        value={sortBy}
        onChange={onSortChange}
        options={[
          { value: "symbol-asc", label: "Symbol (A–Z)" },
          { value: "symbol-desc", label: "Symbol (Z–A)" },
          { value: "price-asc", label: "Price (Low–High)" },
          { value: "price-desc", label: "Price (High–Low)" },
        ]}
      />
    </section>
  );
}
