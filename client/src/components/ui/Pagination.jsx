
// Page buttons for any list that comes from a paginated API
// (`pagination` is the object the backend returns: page, limit, totalItems, totalPages, hasNextPage, hasPreviousPage).
// `itemLabel` is the word used in "Showing 1–8 of 19 orders".
// Long lists are shortened with dots: 1 … 16 17 18 … 34, so the buttons never overflow the screen.

import { ChevronLeft, ChevronRight } from "lucide-react";

import { getPageItems } from "./pagination.utils.js";
import "./Pagination.css";

export default function Pagination({
  pagination,
  onPageChange,
  itemLabel = "items",
}) {
  const {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  } = pagination;

  if (totalPages <= 1) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalItems);

  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination__info">
        Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of{" "}
        <strong>{totalItems}</strong> {itemLabel}
      </p>

      <div className="pagination__controls">
        <button
          type="button"
          className="pagination__button pagination__arrow"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>

        {getPageItems(page, totalPages).map((item) =>
          typeof item === "string" ? (
            <span key={item} className="pagination__gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`pagination__button ${
                item === page ? "pagination__button--active" : ""
              }`}
              onClick={() => onPageChange(item)}
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          className="pagination__button pagination__arrow"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
