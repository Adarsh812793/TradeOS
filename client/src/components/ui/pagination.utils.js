// Works out which page buttons to show. Always the first and last page, the current page and one on each side,
// and "gap" markers where pages are skipped. Short lists show every page.
export function getPageItems(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  // Near the start or end, show a longer run so the number of buttons stays the same
  const runStart = page <= 3 ? 2 : start;
  const runEnd = page <= 3 ? 4 : page >= totalPages - 2 ? totalPages - 1 : end;
  const from = page >= totalPages - 2 ? totalPages - 3 : runStart;

  if (from > 2) items.push("gap-start");

  for (let pageNumber = from; pageNumber <= runEnd; pageNumber++) {
    items.push(pageNumber);
  }

  if (runEnd < totalPages - 1) items.push("gap-end");

  items.push(totalPages);

  return items;
}
