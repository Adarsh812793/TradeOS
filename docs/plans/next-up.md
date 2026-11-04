# Next up (saved 2026-11-03, updated 2026-11-04)

## Status 2026-11-05
Done on branch `feature/fixing-small-bugs` (4 commits after the initial commit): error messages, placeholder text, 10 stocks per page, `--space-6`, watchlist `₹`, the last lint errors (client lint is 0), debug logs removed, auth rate limit back to 10 per 15 minutes (refresh has its own limit of 100), `npm audit fix` + `npm update` in both projects. Remaining from this list: choose a bigger direction (point 3 below), and decide whether to upgrade `@hookform/resolvers` 5 -> 7 and the dev-only `--force` audit findings.

## Pick up here (original)
1. **Set up Git** (not a repository yet): `git init`, a `.gitignore` covering `.env` files and `node_modules`, check for secrets, first commit. Ask before creating the repo and committing.
2. **Finish the small bugs**: item 3 below (error messages), the last 4 lint errors, the placeholder text "current-prev close / P & L percent" in `StockHeader`, the `console.log(page, limit)` in `useOrders` and the debug logs on the refresh route, the Stocks page size of 3, the missing `--space-5` token, and `WatchlistTable` printing `INR` instead of `₹`.
3. **Choose a bigger direction**: UI/UX review (recommended, one page at a time, propose before changing), live prices (needs a data provider), forgot password by email OTP (needs an email service), or deployment (hard-coded CORS origin and cross-site cookies will need attention).

## The original five

Navbar search and notifications (version 1) are done. These five items are the candidates for the next session. Pick one, then (as always) inspect the code and explain the plan before changing anything.

## 1. Clear the known lint errors (partly done 2026-11-04: 13 -> 4 left)
Done: all unused variables/imports, the `lib/api.js` one and the ref-in-render one in `AuthContext.jsx`. Still open: four "setState directly inside an effect" errors (`MarketOverview`, `RecentActivity`, `WatchlistPreview`, `StocksPage:106`). Original list:
`npm run lint` in `client/` reports 13 errors, all in older files: `AuthContext.jsx`, `MarketOverview.jsx`, `RecentActivity.jsx`, `WatchlistPreview.jsx`, `StockHeader.jsx`, `lib/api.js`, `main.jsx`, `SignupPage.jsx`, `StockDetailsPage.jsx` (unused `watchlistError`), `StocksPage.jsx` (unused `setItemsPerPage`, `setCurrentPage(1)` inside an effect, missing `--space-5` token). Small and mechanical; the goal is a lint-clean client.

## 2. Merge the duplicate currency formatters (DONE 2026-11-04)
All 10 local formatters now use `formatCurrency` (also `MarketOverview`, `MarketSummary`, `StockHeader`, which were not in the original list). `WatchlistTable` still prints `INR 1,420.50` (not a function, and switching would change what the user sees). Original list:
Replace the local formatters with `utils/currency.utils.js` in: Dashboard `AccountSummary`, `RecentActivity`, `WatchlistPreview`, and Stocks `StockTable`, `StockCard`, `StockPositionOrders`, `PlaceOrderCard`.

## 3. Fix the axios-style error reading
`StockDetailsPage.jsx`, `useOrders.js` and `WatchlistPage.jsx` read `err.response?.data?.message`, but `lib/api.js` throws plain `Error`s, so users always see the generic message. Use `err.message` so the server's real message shows (e.g. "Insufficient wallet balance").

## 4. Retry on 401 in `lib/api.js` (DONE 2026-11-04)
Built as planned, plus a 10 second refresh-token grace period and a 30 minute idle timeout (see CLAUDE.md, "Automatic token renewal" and "Idle timeout"). Backend tests: `server/tests/auth.refresh.integration.test.js`. Original notes:
The access token lives 15 minutes and there is no automatic renewal: after it expires every request fails (the notification polling fails silently) until the page is reloaded. Idea: on a 401, call `/api/auth/refresh` once (the cookie rotates the refresh token), update the token in `AuthContext`, retry the original request, and send the user to login if the refresh fails. Needs care for several requests failing at once (share one refresh). Bigger change: propose the design first.

## 5. Navbar search: Enter without a selection (DONE 2026-11-04)
Enter with nothing highlighted opens `/stocks?search=<text>`; the Stocks page reads the search text from the URL. Original idea:
Pressing Enter with nothing highlighted could open `/stocks?search=<query>`, with the Stocks page reading its starting search term from the URL, so the navbar search and the Stocks page filter work together. Small addition.

## Also still open (from CLAUDE.md)
- Preferences section content, and the email-OTP forgot-password flow.
- Transactions filters and totals (need backend support first).
- Portfolio value history chart (needs live prices + daily snapshots).
- Notification type extensions (market alerts) wait for a reliable live-price source.
