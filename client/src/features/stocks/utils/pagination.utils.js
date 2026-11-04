//Function that returens what stocks should be displayed in current page

// 1. Get items for the current page
export function paginateItems(items, currentPage, itemsPerPage) {
  const startIndex = (currentPage - 1) * itemsPerPage;

  return items.slice(startIndex, startIndex + itemsPerPage);
}

// 2. Calculate the total number of pages
export function getTotalPages(totalItems, itemsPerPage) {
  return Math.ceil(totalItems / itemsPerPage);
}