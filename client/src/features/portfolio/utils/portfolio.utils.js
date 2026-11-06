

// Today, 10:42 AM  /  01 Nov, 10:42 AM
export function formatLastUpdated(date) {
  if (!date) return "";

  const time = date
    .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    .toUpperCase();

  const isToday = date.toDateString() === new Date().toDateString();

  if (isToday) return `Today, ${time}`;

  const day = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

  return `${day}, ${time}`;
}

// Options for the "Sort by" dropdown. `value` is the holding field to sort on (symbol is A-Z, the rest high to low)
export const HOLDING_SORT_OPTIONS = [
  { value: "currentValue", label: "Current Value" },
  { value: "investedValue", label: "Invested Value" },
  { value: "unrealizedPnL", label: "P&L" },
  { value: "pnlPercentage", label: "Returns %" },
  { value: "symbol", label: "Symbol (A–Z)" },
];

// Filters holdings by symbol / company name, then sorts them. Returns a new array.
export function filterAndSortHoldings(holdings, searchTerm, sortBy) {
  const query = searchTerm.trim().toLowerCase();

  const filtered = query
    ? holdings.filter(
        ({ stock }) =>
          stock.symbol.toLowerCase().includes(query) ||
          stock.companyName.toLowerCase().includes(query)
      )
    : [...holdings];

  return filtered.sort((a, b) => {
    if (sortBy === "symbol") {
      return a.stock.symbol.localeCompare(b.stock.symbol);
    }

    // Numbers: highest first, symbol as a tie-breaker so the order stays stable
    return (
      b[sortBy] - a[sortBy] || a.stock.symbol.localeCompare(b.stock.symbol)
    );
  });
}

// Share of the portfolio (by current value) held in each stock, largest first.
// With more than `maxSlices` holdings, the smallest are grouped into one "Others" slice.
export function getAllocation(holdings, maxSlices = 5) {
  const sorted = holdings
    .filter((holding) => holding.currentValue > 0)
    .sort(
      (a, b) =>
        b.currentValue - a.currentValue ||
        a.stock.symbol.localeCompare(b.stock.symbol)
    );

  const total = sorted.reduce((sum, holding) => sum + holding.currentValue, 0);

  if (total <= 0) return [];

  const toSlice = (holding) => ({
    key: holding.stock._id,
    label: holding.stock.symbol,
    value: holding.currentValue,
    percent: (holding.currentValue / total) * 100,
  });

  if (sorted.length <= maxSlices) return sorted.map(toSlice);

  const rest = sorted.slice(maxSlices - 1);
  const restValue = rest.reduce((sum, holding) => sum + holding.currentValue, 0);

  return [
    ...sorted.slice(0, maxSlices - 1).map(toSlice),
    {
      key: "others",
      label: "Others",
      value: restValue,
      percent: (restValue / total) * 100,
    },
  ];
}
