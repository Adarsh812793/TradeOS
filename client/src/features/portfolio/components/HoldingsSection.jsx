
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import HoldingsToolbar from "./HoldingsToolbar.jsx";
import HoldingsTable from "./HoldingsTable.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";

import { filterAndSortHoldings } from "../utils/portfolio.utils.js";

// Owns the search / sort state and decides what to show: the list,
// a "no matches" message, or the "no holdings yet" state.
export default function HoldingsSection({ holdings }) {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("currentValue");

  const visibleHoldings = useMemo(
    () => filterAndSortHoldings(holdings, searchTerm, sortBy),
    [holdings, searchTerm, sortBy]
  );

  const hasHoldings = holdings.length > 0;

  return (
    <section>
      <HoldingsToolbar
        totalCount={holdings.length}
        visibleCount={visibleHoldings.length}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortChange={setSortBy}
        showControls={hasHoldings}
      />

      {!hasHoldings && (
        <EmptyState
          icon="portfolio"
          title="No holdings yet"
          description="Stocks you buy will appear here with their profit and loss."
          actionLabel="Explore stocks"
          onAction={() => navigate("/stocks")}
        />
      )}

      {hasHoldings && visibleHoldings.length === 0 && (
        <EmptyState
          icon="search"
          title="No matching holdings"
          description={`Nothing in your portfolio matches "${searchTerm.trim()}".`}
          actionLabel="Clear search"
          onAction={() => setSearchTerm("")}
        />
      )}

      {visibleHoldings.length > 0 && (
        <HoldingsTable holdings={visibleHoldings} />
      )}
    </section>
  );
}
