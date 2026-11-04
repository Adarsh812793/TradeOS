// Checks whether a stock's symbol or company name contains the query (case-insensitive).
// Shared by the Stocks page filters and the navbar search so both match the same way.
export function matchesStockSearch(stock, query) {
  const search = query.trim().toLowerCase();

  if (!search) return true;

  return (
    stock.symbol.toLowerCase().includes(search) ||
    stock.companyName.toLowerCase().includes(search)
  );
}

//A simple function that returns filtered stocks as input -> A pure function

// 1. Filter stocks by search term, exchange, and sort order
export  function filterAndSortStocks(
  stocks,
  searchTerm,
  selectedExchange,
  sortBy
) {
  // 2. Create a copy so we don't mutate the original array
  let result = [...stocks];

  // 3. Normalize the search term
  const search = searchTerm.trim().toLowerCase();

  // 4. Filter by symbol or company name
  if (search) {
    result = result.filter((stock) => matchesStockSearch(stock, search));
  }

  // 5. Filter by exchange
  if (selectedExchange !== "all") {
    result = result.filter(
      (stock) => stock.exchange === selectedExchange
    );
  }

  // 6. Sort the filtered stocks
  switch (sortBy) {
    case "symbol-asc":
      result.sort((a, b) => a.symbol.localeCompare(b.symbol));
      break;

    case "symbol-desc":
      result.sort((a, b) => b.symbol.localeCompare(a.symbol));
      break;

    case "price-asc":
      result.sort((a, b) => a.currentPrice - b.currentPrice);
      break;

    case "price-desc":
      result.sort((a, b) => b.currentPrice - a.currentPrice);
      break;

    default:
      break;
  }

  return result;
}