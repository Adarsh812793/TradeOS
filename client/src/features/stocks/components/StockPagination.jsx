import { ChevronLeft, ChevronRight } from "lucide-react";
import "./StockPagination.css";

export default function StockPagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
}) {
  // 1. Calculate the range of items being displayed
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // 2. Generate page numbers
  const pages = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  );

  // 3. Handle empty results
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="stock-pagination">
      {/* 4. Item range summary */}
      <p className="stock-pagination__summary">
        Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of{" "}
        <strong>{totalItems}</strong> stocks
      </p>

      {/* 5. Pagination controls */}
      <div className="stock-pagination__controls">
        <button
          type="button"
          className="stock-pagination__button stock-pagination__arrow"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Go to previous page"
        >
          <ChevronLeft size={18} />
        </button>

        {pages.map((page) => (
          <button
            key={page}
            type="button"
            className={`stock-pagination__button ${
              currentPage === page ? "is-active" : ""
            }`}
            onClick={() => onPageChange(page)}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          className="stock-pagination__button stock-pagination__arrow"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Go to next page"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}