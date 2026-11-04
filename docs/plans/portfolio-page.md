# Portfolio Page Plan

Reference design: `docs/visuals/PortfolioPage.png` (same layout, but light theme using `client/src/styles/tokens.css`).

## Data (no backend work needed except the chart)

`GET /api/portfolio` returns:

```js
{
  holdings: [{ stock: { symbol, companyName, ... }, quantity, averageBuyPrice,
               currentPrice, investedValue, currentValue, unrealizedPnL, pnlPercentage }],
  summary:  { totalInvestedValue, totalCurrentValue, totalUnrealizedPnL, totalPnLPercentage }
}
```

| Section | Source |
|---|---|
| 4 summary cards | `summary` |
| Allocation donut | `currentValue / totalCurrentValue` per holding, computed on the frontend |
| Holdings table | `holdings` |
| Search and sort | frontend only (endpoint is not paginated) |
| Buy / Sell buttons | link to `/stocks/:stockId` (`PlaceOrderCard` already exists there) |
| Company logos | no logo data, so a circle with the symbol's first letter |
| Portfolio Value (7D) chart | **not available**, see below |

## Components

```
pages/PortfolioPage.jsx (+ .css)         composes sections; handles loading / error / empty

features/portfolio/
  portfolio.api.js                       getPortfolio()
  hooks/usePortfolio.js                  { portfolio, loading, error, lastUpdated, refresh }
  utils/portfolio.utils.js               getAllocation(), filterAndSortHoldings(), getPnlTone()
  components/
    PortfolioHeader.jsx                  title, subtitle, "Last updated", Refresh button
    PortfolioSummaryCards.jsx            4 summary cards (shared Card)
    PortfolioAllocation.jsx              SVG donut + legend (no chart library; group small ones as "Others")
    PortfolioValueChart.jsx              placeholder for now
    HoldingsToolbar.jsx                  "Your Holdings (n)", search, sort
    HoldingsTable.jsx / HoldingRow.jsx   table, Buy/Sell link to stock page
```

Reuse: `Card`, `EmptyState` (`icon="portfolio"`), `LoadingSpinner`, `Button`, Orders table styling, `--color-success` / `--color-danger` tokens.

## Portfolio Value (7D) chart: deferred

`Stock.currentPrice` is static seed data, so portfolio value only changes when the user trades. A history chart would be a flat line until prices move. Showing a "coming soon" card (same pattern as `PortfolioPerformance` on the Dashboard) for now.

Later feature, needs its own design:
1. Sync live FYERS prices into `Stock.currentPrice`
2. `PortfolioSnapshot` collection (userId, date, totalValue, totalInvested), written daily by a scheduled job or on portfolio load
3. `GET /api/portfolio/history?range=7D`

## Build order

- [x] 1. `portfolio.api.js` and `usePortfolio`; show raw data to confirm the shape
- [x] 2. `PortfolioHeader` and `PortfolioSummaryCards`
- [x] 3. `HoldingsTable` and `HoldingRow` (profit/loss colours, Buy/Sell links)
- [x] 4. `HoldingsToolbar` (search and sort)
- [x] 5. `PortfolioAllocation` (SVG donut)
- [x] 6. Chart placeholder, loading / error / empty states, narrow-screen checks

## Fixes to make along the way

- `server/src/modules/portfolio/portfolio.service.js` crashes if `holding.stockId` is `null` (stock deleted). Add a guard.
- Currency formatting is duplicated (`AccountSummary`, `orders.utils`). Reuse the existing helper instead of adding a third copy.

## Decisions made while building

- `formatCurrency` lives in `client/src/utils/currency.utils.js` (shared). `orders.utils.js` keeps only `formatOrderDate`.
- Tokens added: `--color-info`, `--color-info-tint`. Chart colours will be added in step 5 when the donut needs them.
- Below 1100px the holdings table is replaced by cards (`HoldingCard`, 2 per row on tablets, 1 on phones). The 1100px number is in `HoldingsTable.css`; the table itself keeps a horizontal scroll as a safety net.
- Buy / Sell are `<Link>`s styled with `.btn`. Sell goes to `/stocks/:id?action=sell`; `StockDetailsPage` reads `action` to preselect the Sell form.
- Server guard added: `portfolio.service.js` skips holdings whose stock no longer exists.
- Empty state ("No holdings yet" + Explore stocks) is already in `PortfolioPage`.

## Known leftovers (not part of this feature)

- `AccountSummary`, `RecentActivity`, `WatchlistPreview` (Dashboard) and `StockPositionOrders` each still define their own copy of the currency formatter. They could use `utils/currency.utils.js`.
- `StockDetailsPage.jsx` has an unused `watchlistError` variable (ESLint error).
- `useOrders.js` reads `err.response?.data?.message`, which never exists with `fetch`; use `err.message`.
- `HoldingsSection` owns the search / sort state (instead of the page) and decides between list, "no matches" and "no holdings yet". `HoldingStock` and `HoldingActions` are shared by the table row and the card.
- Allocation donut is hand-built SVG (no chart library). Top 4 holdings + "Others" when there are more than 5. Chart colours are `--color-chart-1..5` and `--color-chart-other` in `tokens.css`. A chart library (e.g. recharts) is worth considering for the 7-day value chart, not for this.
- Stocks page watchlist: `useWatchlistToggle` (features/watchlist/hooks) loads the watchlist once and handles add / remove; a 409 on add or a 404 on remove just syncs the UI. `StockTable` and `StockCard` take `isSaved` / `isBusy` / `onToggleWatchlist`.

## More known leftovers

- `StocksPage.jsx`: unused `setItemsPerPage` and `setCurrentPage(1)` inside an effect (both ESLint errors); page size is fixed at 3 items.
- `tokens.css` has no `--space-5`, but `StocksPage.css` uses `var(--space-5)` for its gap, so that gap is ignored.

## Step 6 notes

- `PortfolioValueChart` is a placeholder card next to the allocation donut; swap its empty panel for the real chart once value history exists.
- Loading uses the shared `LoadingSpinner`; a failed first load shows the error with a "Try again" button; a failed refresh keeps the old data and shows a banner.
- Checked in headless Edge with a mock API at 1440 / 900 / 390 / 360px: no horizontal overflow at any width; empty-portfolio and server-error states render correctly.
