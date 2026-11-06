
import { Search } from "lucide-react";

import Select from "../../../components/ui/Select.jsx";

import { HOLDING_SORT_OPTIONS } from "../utils/portfolio.utils.js";

import "./HoldingsToolbar.css";

export default function HoldingsToolbar({
  totalCount,
  visibleCount,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  showControls = true,
}) {
  // "Your Holdings (4)" normally, "Your Holdings (1 of 4)" while a search hides some
  const countLabel =
    visibleCount === totalCount
      ? totalCount
      : `${visibleCount} of ${totalCount}`;

  return (
    <div className="holdings-toolbar">
      <h2 className="holdings-toolbar__title">
        Your Holdings ({countLabel})
      </h2>

      {showControls && (
        <div className="holdings-toolbar__controls">
          <div className="holdings-toolbar__search">
            <Search
              size={18}
              className="holdings-toolbar__search-icon"
              aria-hidden="true"
            />

            <input
              type="search"
              name="holdings-search"
              className="holdings-toolbar__search-input"
              placeholder="Search holdings..."
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              aria-label="Search holdings by company name or symbol"
            />
          </div>

          <Select
            className="holdings-toolbar__sort"
            inline
            label="Sort by"
            id="holdings-sort"
            value={sortBy}
            onChange={onSortChange}
            options={HOLDING_SORT_OPTIONS}
          />
        </div>
      )}
    </div>
  );
}
