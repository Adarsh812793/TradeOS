
// Page buttons for any list that comes from a paginated API
// (`pagination` is the object the backend returns: page, limit, totalItems, totalPages, hasNextPage, hasPreviousPage).
// `itemLabel` is the word used in "Showing 1–8 of 19 orders".

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

  // Page numbers around the current page
  const visiblePages = [];
  const first = Math.max(1, page - 2);
  const last = Math.min(totalPages, page + 2);

  for (let pageNumber = first; pageNumber <= last; pageNumber++) {
    visiblePages.push(pageNumber);
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination__info">
        Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of{" "}
        <strong>{totalItems}</strong> {itemLabel}
      </p>

      <div className="pagination__controls">
        <button
          type="button"
          className="pagination__button"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>

        {visiblePages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={`pagination__button ${
              pageNumber === page ? "pagination__button--active" : ""
            }`}
            onClick={() => onPageChange(pageNumber)}
            aria-current={pageNumber === page ? "page" : undefined}
          >
            {pageNumber}
          </button>
        ))}

        <button
          type="button"
          className="pagination__button"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
