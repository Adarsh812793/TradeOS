
import { Search } from "lucide-react";

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

          <label className="holdings-toolbar__sort">
            <span>Sort by</span>

            <select
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value)}
              className="holdings-toolbar__select"
            >
              {HOLDING_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
