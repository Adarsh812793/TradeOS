# UI redesign

A full visual redesign of TradeOS plus a new landing page, done in phases so that the app keeps working the whole way through. Visual reference: `docs/visuals/NewTheme.png` and https://claude.ai/artifact/MPPddLBZ5BzHjAdb4RJ2yG (direction A). These only set the style; the actual page designs are worked out phase by phase.

## Decisions

| Topic | Decision |
|---|---|
| Theme | **Indigo Desk** across the whole app. Background `#12173A`, panel `#1A2150`, text `#EEF0FA`, accent marigold `#F6B631`, up `#3DDCA0`, down `#FF8273` |
| Fonts | Bricolage Grotesque (headings, big numbers), Instrument Sans (text), Spline Sans Mono (prices, tables) |
| Colour meaning | Green and red mean only up and down. Marigold is the brand and action colour |
| Landing | New page at `/` with a 3D market terrain: columns rise and fall, green while rising, red while falling |
| 3D scope | Landing page only. Inside the app, only small motion such as numbers animating when they change |
| Navigation | Icon rail, plus a top market strip with search, notifications and profile |
| Themes | Dark first. A light theme toggle comes later, which the token work makes possible |
| Stock prices | **Simulated** and clearly labelled "Simulated", until a licensed vendor is chosen |
| Market hours | Prices move only during market hours (9:15 AM to 3:30 PM IST, weekdays). Outside them prices hold still, so P&L holds still too |
| Exchange holidays | Prices also stop on exchange holidays, from a yearly list in one config file |
| Orders when closed | Blocked, with a clear "Market closed" message. After-market orders are a possible later feature |
| NIFTY 50 / SENSEX | Stay real, from FYERS |
| Delivery | One branch and one PR per phase |

## Working rules

- **Appearance only.** Page phases change JSX structure and CSS. Hooks, API calls, validation and business logic stay as they are, unless the phase says otherwise.
- **`main` always works.** Each phase is merged on its own and can be reverted on its own.
- **After every phase:** `npm run lint` and `npm run build` in `client/`, `npm run test:run` in `server/` when the backend changed, then the user runs the checklist below for the pages touched. Claude also checks the pages itself with screenshots from a headless browser (desktop and phone width), which catches layout problems but not how motion feels.
- **Commits** are announced first; the last commit of each branch updates the docs. **Pushing** is always asked for first, and nothing is ever pushed to `main` (see CLAUDE.md).
- **Teaching:** every phase ends with a short "what is worth learning here" summary for the user.

## Baseline before the redesign (2026-11-05, `main`)

- Client lint: 0 problems. Client build passes.
- Bundle: JS 571.93 kB (169.91 kB gzip), CSS 112.25 kB (15.67 kB gzip), all in one chunk.
- Server tests: 104 passed, 1 skipped (the live Cloudinary test).
- CSS: 70 files, about 8,000 lines, 346 hard-coded colour values.

## Phases

### Phase 0. Safety net (this branch: `docs/ui-redesign-plan`)
This plan and the regression checklist. **Done when** the user has confirmed the checklist is complete.
*Learn:* regression checklists, keeping a baseline, why large changes ship as small PRs.

### Phase 1. Foundation (`feature/ui-foundation`) - DONE 2026-11-05 (awaiting PR)
Built: Indigo Desk tokens, self-hosted fonts, all 346 hard-coded colours replaced by role, page title and favicon, a screenshot tool (`npm run screenshots`), and an optional `CORS_ORIGIN` server setting. Checked with 32 before and after screenshots and a contrast check (all text pairs pass 4.5:1). Bundle: JS 572 kB (unchanged), CSS 112 kB to 122 kB, fonts load as separate files only when used. Original scope:
Self-hosted fonts, Indigo Desk tokens with a proper type and spacing scale, replace hard-coded colours and font sizes, remove the Arial and `#f5f7fb` defaults in `index.css`, set the page title and favicon. **Done when** the whole app is dark, every page works, and no hex values remain outside `tokens.css`.
*Learn:* design tokens, semantic versus raw colour names, type scales, colour contrast.

### Phase 2. Shared components (`feature/ui-components`) - DONE 2026-11-06 (awaiting PR)
Built: component gallery at `/dev/ui` (dev only); Button (variants by meaning, sizes, loading, block); Input (hint, ref, eye icon, dark autofill) and a new Select; Card, Badge, EmptyState restyled; Modal with focus handling and unique ids; ResultState (animated success tick) and the order success screen; one Pagination with page-number dots (fixes the Stocks sideways scroll); SegmentedControl; Table and PriceChange (first used on Holdings and Orders); Skeleton loading states on the main pages. Small fixes along the way: failed-order error was hidden behind the dialog overlay, the order dialog had no styling, the sign-up `block` warning, a `.orders-table` CSS clash, the Orders empty-state icon. Checked with screenshots, real order flows (buy, sell, failing order), keyboard tests, a delayed-API skeleton test on 8 pages x 2 widths, and the page-list logic for every list size to 60. Bundle: JS 572 kB to 579 kB, CSS 122 kB to 127 kB. Original scope:
Restyle Button, Input, Card, Badge, Modal, Pagination, EmptyState and LoadingSpinner. Add Table, price-change and loading-skeleton components. **Done when** they are in use and every page still works.
*Learn:* component APIs and variants, keeping props stable, focus states.

### Phase 3. App layout (`feature/ui-app-shell`) - DONE 2026-11-07 (awaiting PR)
Built: a shared index-quote cache on the server (30 s fresh, one FYERS call for any number of simultaneous requests, 5 s cooldown after a failure, earlier quotes labelled stale for at most 5 minutes; plus a fix for a missing import that broke the expired-token path); the app frame as a CSS grid; the 64px icon rail; the phone bottom bar with a More sheet; the top bar with a market strip; one `<main>` per page and a skip link; one `--navbar-height` and one 768px phone breakpoint; every page loaded on demand (main download 581 kB to 346 kB, 173 kB to 110 kB gzipped) with a progress bar; a friendly error screen; scroll to top on navigation; the dead "Forgot password?" link removed. The Holdings table now fits at 1180px. Checked with 44 frame checks (7 links x 4 widths), 19 market strip checks (mocked live, delayed, empty, 502, fake-clock polling), 13 loading/error/scroll checks, 21 server tests for the cache (mutation-checked), and the earlier phases' regression scripts. Original scope:
Icon rail instead of the sidebar, market strip, restyled navbar dropdowns, mobile navigation, pages loaded on demand. The sidebar collapse button goes away on purpose. **Done when** the Navigation and Navbar sections of the checklist pass.
*Learn:* CSS grid app layouts, route-level code splitting, accessible navigation.

### Phase 4. Simulated market (`feature/simulated-market`) - DONE 2026-11-07 (awaiting PR)
Built: exact money maths in whole paise (`utils/money.js`; fixes float drift such as 3 x 2850.05 = 8550.150000000001); order retry on write conflicts (five simultaneous orders used to give four 500s); IST market hours and a 2026 NSE holiday list; orders blocked with 403 `MARKET_CLOSED`; the development-only `MARKET_ALWAYS_OPEN` override (the server refuses it outside development/test); a simulated price provider (25% yearly volatility scaled to 15 s steps, 5-paise ticks, 10% daily limit) and a 15 s price job that holds still when the market is closed and cannot double-move a price; `previousClose` / `tradingDay` kept in MongoDB; 5-minute (14 calendar days) and daily (forever) OHLC candles with `GET /api/stocks/:id/candles`; a safe dry-run-first backfill script (applied to the dev database: 2,480 daily and 7,500 five-minute synthetic candles, user data and prices verified unchanged); `GET /api/market/status`; "Market open/closed" and "Simulated" labels; a 30 s quiet price refresh on the price pages; a disabled order form with the reason when closed, estimate wording and the execution price on the result; today's change in the stock list and header. Checked with 237 server tests (key rules mutation-tested), 22 closed-market and 12 open-market browser checks, and the earlier regression scripts. Bundle: JS 346 kB to 347 kB. Original scope:
Backend: a market-hours module, a provider module that a real vendor can replace later, a price job that moves `Stock.currentPrice` only while the market is open, a holiday list, orders rejected while the market is closed, previous close and daily change, stored candles with backfilled history, tests. Frontend: polling hook and "Simulated" badge. **Done when** prices move during market hours and hold outside them, and orders and P&L stay correct.
*Learn:* random-walk price models, background jobs, time zones (IST), the provider pattern, polling costs.

### Phase 5. Landing and auth (`feature/landing-page`) - DONE 2026-11-10 (awaiting PR)
Built: `GuestRoute` (logged-in users are sent to `/dashboard` from `/`, `/login` and `/signup`); the `three` dependency (only `three`: no React wrapper, no scroll library; native scrolling); a seeded random-walk terrain drawn as one instanced mesh (1,144 columns), lazy-loaded in its own 133 kB (gzipped) file, paused when off-screen or hidden, with a still picture first and for reduced motion, data saver, weak devices and no WebGL; the landing page (hero, how it works, what you can do, a full "The prices here are simulated" section, footer); `Button as` for real links; a shared `AuthLayout` for login and signup with one picture behind the whole page, gradients instead of a hard edge, and about 570 lines of duplicated CSS removed; validation on blur, autofocus on devices with a mouse, a live password rule, a card entrance, and a fix for a lost-click bug that validating on blur exposed (`runAfterPointerRelease`, `Input animateMessage`); a richer left side on login only (bigger headline, three numbered rows, a market open/closed pill, a brighter picture). Brand copy no longer says "real market data". Checked with maths checks on the simulation, 29 terrain behaviour checks, landing checks on the production build (heading outline, honesty wording, links, no sideways scroll from 320 to 1920 px, no lonely last words, text contrast of at least 5:1 over the moving terrain, keyboard order, slow-4G load with zero layout shift), 32 + 30 + 20 login and signup checks (each key fix mutation-tested), and the earlier phases' regression scripts. Bundle: main JS 347.35 kB to 347.65 kB (unchanged), `three` only in `TerrainScene` (536 kB, 133 kB gzipped), landing page 9.5 kB. Original scope:
3D terrain with Three.js and React Three Fiber, smooth scrolling on this page only, `/` becomes the landing page and logged-in visitors go to `/dashboard`, login and signup redesign. 3D loads only on this route, pauses off-screen, and shows a still image for weak devices or reduced-motion settings. **Done when** the Landing, Login and Signup sections pass and the app bundle does not include Three.js.
*Learn:* WebGL basics, instanced rendering, lazy loading, performance budgets, `prefers-reduced-motion`.

### Phase 6. Trading pages (`feature/ui-trading-pages`)
Stocks list and stock details, with a real chart (library to be agreed; `lightweight-charts` requires a TradingView attribution) and the order panel beside it. **Done when** the Stocks and Stock details sections pass.
*Learn:* chart libraries, information hierarchy, tabular numbers.

### Phase 7. Money pages (`feature/ui-portfolio-dashboard`)
Portfolio and dashboard. **Done when** those sections pass and figures match the old version for the same account.
*Learn:* summary-before-detail layouts, hand-built SVG charts.

### Phase 8. Remaining pages (`feature/ui-remaining-pages`)
Orders, transactions, watchlist, account, 404. **Done when** those sections pass.
*Learn:* table-to-card responsive patterns, dialog accessibility.

### Phase 9. Polish (`feature/ui-polish`)
Motion, phone and tablet layouts, accessibility, performance, the full checklist one last time. **Done when** the whole checklist passes.
*Learn:* motion principles, Lighthouse, keyboard testing.

## Findings carried to later phases

- **Still on their own CSS (moved in the page phases):** `StockTable`, `StockCard`, `WatchlistTable`, `TransactionsTable` and `StockPositionOrders` have their own table styling and should move to `Table`; Stocks / Orders / Transactions cards share a look that could become one component. The holdings Buy / Sell links use a bare `.btn` class with their own colours (a `ButtonLink` could replace that).
- **Layout:** the Holdings table needs about 1,000px of panel width; at a 1180px screen it scrolled inside its panel because the 240px sidebar left little room. FIXED in Phase 3: the 64px icon rail leaves about 1,066px at a 1180px screen.
- **Stock page:** the header's Buy button is marigold (primary) while the order panel's Buy is green; decide in Phase 6 (green = buy).
- **Tests:** the order quantity field relies on the browser's own `min` / `step` validation, so the app's "positive whole number" message only shows if the browser lets the submit through.

- **Phase 2:** `<Button block>` passes `block` to the DOM and React warns ("non-boolean attribute"); make it a proper prop.
- **Phase 3 (done):** the Sidebar and its collapse arrow are gone; Login's dead "Forgot password?" link was removed. Carried forward: Back opens pages at the top instead of the old scroll position (pages load their data after they appear); the market strip was only tested against mocked and unconnected FYERS, so check it once with a real FYERS connection; the dashboard's MarketOverview still fetches indices on its own (cheap because of the server cache).
- **Phase 6:** the Stocks page pagination lists every page number and scrolls sideways once there are many pages (found with 34 pages); it needs ellipsis truncation. The header Buy button is marigold while the Place Order panel's Buy is green: pick one meaning (green = buy).
- **Phase 4 (done):** the holiday list needs the next year added each January; the price chart (Phase 6) and portfolio performance chart (Phase 7) are still placeholders, and the candles and `/candles` endpoint are ready for the first; the job's cost grows linearly with the number of stocks (batch the writes if the list grows to hundreds); the test database holds ~1,400 leftover test stocks that slow any run of the price job against it.
- **Phase 5 (done):** a terms-and-conditions checkbox on sign-up ("I understand the money is virtual and prices are simulated", wording from `SimulatedNotice.jsx`, maybe with a stored timestamp) and logging the user in right after sign-up are planned but not built; signup could adopt login's richer left side; the main bundle (110 kB gzipped) dominates the landing page's load on slow connections; the real NIFTY and SENSEX levels are mentioned on the landing page only in a footnote (the FYERS public-display licensing question stays open).
- **All phases:** prices, tables and big numbers should use `--font-mono` / `--font-display` as each page is rebuilt; Phase 1 only changed the base fonts.

## Open questions

1. **FYERS licensing.** Public display of the real indices should be checked against the vendor's terms before going public.
2. **Chart library.** Agree on one in Phase 6.

## Known and left for later

- **FYERS re-authorization.** The token expires daily at 6:30 AM IST and needs an admin to log in again. The user knows and will fix this separately, so the redesign adds no special handling for it.

## Regression checklist

Run the sections for the pages a phase touched. "Works" includes the loading state, the error state and the phone layout.

### Everywhere (auth and session)
- [ ] Reloading a page while logged in keeps the login
- [ ] After 15 minutes, requests renew the token without the user noticing
- [ ] Two open tabs both keep working across a renewal
- [ ] 30 minutes without activity signs out and the login page explains why
- [ ] Protected pages redirect to `/login` when logged out
- [ ] Unknown URLs show the 404 page, and its "Go to Dashboard" link works

### Landing (new in Phase 5)
- [ ] `/` shows the landing page when logged out, and goes to `/dashboard` when logged in
- [ ] Sign up and log in buttons (header, hero, footer) open the right pages
- [ ] The 3D terrain starts by itself on a wide screen, and the text and buttons are there before it
- [ ] Scrolling the terrain out of view, or switching tabs, stops it (no frames are drawn)
- [ ] Reduced motion, data saver, a weak device and a browser without WebGL show the still picture, with the whole page intact
- [ ] The "Virtual money" and "Simulated prices" badges, the "The prices here are simulated" section and the footer line are all there and readable
- [ ] Phone: nothing scrolls sideways, buttons fit on one row, the terrain shows below the text
- [ ] The login and signup pages do not download the 3D code

### Login (`/login`)
- [ ] Field validation messages show
- [ ] Wrong password shows the server's message
- [ ] Correct login opens the dashboard
- [ ] Show/hide password works
- [ ] Messages after sign-up, account deletion, idle sign-out and expired session all show
- [ ] "Create an account" link works (without a page reload), and the logo opens the landing page
- [ ] The cursor starts in the email field on a computer (not on a phone), a field is checked when you leave it, and a failed submit moves the cursor to the first problem
- [ ] Clicking a link or button right after typing in a field works first time (the error appears after the click)
- [ ] Wide screens: the left side has the bigger headline, the three numbered rows and the market open/closed pill, over the brighter picture; phones look as before
- [ ] Known bug before the redesign: "Forgot password?" links to `/forgot-password`, which does not exist

### Signup (`/signup`)
- [ ] Validation, including passwords that do not match
- [ ] Email already in use shows the server's message
- [ ] Success goes to login with a message, and a new account gets the welcome notification
- [ ] The password hint ticks at 8 characters; fields sit at their normal distance, and the room under a field opens smoothly only when it shows an error
- [ ] The line under the form says the money is virtual and prices are simulated

### Navigation (sidebar or rail)
- [ ] Every link opens its page: Dashboard, Stocks, Portfolio, Orders, Watchlist, Transactions
- [ ] The active page is highlighted
- [ ] Phone: the bottom bar links work, and "More" (Watchlist, Transactions, Account) opens and closes, including by tapping outside or Esc

### Navbar: market strip
- [ ] NIFTY 50 and SENSEX show with level and percent (green up, red down) on screens wider than 1000px
- [ ] Updates about every minute; stops while the tab is hidden
- [ ] When FYERS is unavailable the strip is simply empty (no error text); a quote the server marks stale shows dimmed with "Delayed" and a time
- [ ] Hidden on phones and narrow tablets

### Navbar: search
- [ ] Opens with results from the database, filters by symbol and company name
- [ ] Clicking a result opens that stock
- [ ] Arrow keys plus Enter open the highlighted stock
- [ ] Enter with nothing highlighted opens `/stocks?search=...`
- [ ] Footer link, clear button, Esc, click outside, `/` and Ctrl/Cmd+K all work
- [ ] Load failure shows "Try again"

### Navbar: notifications
- [ ] Green badge shows the unread count, `99+` above 99, hidden at 0
- [ ] Badge updates right after an order and after a password change, and within 60 seconds otherwise
- [ ] Clicking a notification marks it read and opens its link
- [ ] Tick marks one as read and stays on the page; "Mark all read" works
- [ ] "Load more", the empty state and "Try again" work

### Navbar: profile menu
- [ ] Shows the photo or initial and the name, and updates at once after an edit
- [ ] "Account" and "Log out" work

### Market status and simulated prices (new in Phase 4; needs `MARKET_ALWAYS_OPEN=true` outside market hours)
- [ ] Backend console prints "Price job started" and shows no repeating `[prices]` errors
- [ ] Prices on Stocks change by themselves within about 30 s, in steps of 0.05, with no skeleton flash
- [ ] "Today" shows green up / red down with a percent, starting near 0%
- [ ] Stock details price, change today and "Your Position" profit/loss follow the price
- [ ] Switching tabs for a minute and returning refreshes at once
- [ ] "Market open" and "Simulated" labels show on Dashboard, Stocks, Stock details, Portfolio and (non-empty) Watchlist
- [ ] Buy: the total is labelled an estimate; the result shows the execution price; the wallet falls by exactly price x quantity
- [ ] With the override off: labels say "Market closed", the order button is disabled with the next opening time, prices hold still, and the server answers 403 `MARKET_CLOSED`
- [ ] Existing wallet, holdings and orders are unchanged after the backfill
- [ ] `GET /api/market/status` and `GET /api/stocks/:id/candles?range=1W` answer; `?range=5Y` answers 400
- [ ] Phone width: the daily change shows on cards, labels wrap, no sideways scroll

### Dashboard (`/dashboard`)
- [ ] Account summary figures load (and follow price changes every 30 s), and the error state's reload works
- [ ] "Market open/closed" and "Simulated" labels show under the Account Summary title
- [ ] Portfolio performance section shows
- [ ] Market overview shows NIFTY and SENSEX; Refresh and retry work
- [ ] Watchlist preview: "View all", browse stocks when empty, Retry
- [ ] Recent activity: "View all", browse stocks when empty, Retry

### Stocks (`/stocks`)
- [ ] List loads; search, exchange filter and sort work
- [ ] The "Today" column shows the daily change (colour, arrow and percent), aligned with the price
- [ ] `?search=` in the URL filters the list, and typing updates the URL
- [ ] Pagination works and returns to page 1 when filters change
- [ ] Watchlist bookmark adds and removes, in table and card layouts
- [ ] Stock links and arrows open details
- [ ] Table on wide screens, cards on narrow screens

### Stock details (`/stocks/:id`)
- [ ] Header shows name, symbol, exchange, price, today's change and the market labels
- [ ] Watchlist button toggles, and a failure shows the banner
- [ ] Header Buy and Sell switch the form and scroll to it
- [ ] `?action=sell` opens on the Sell form
- [ ] Quantity validation (positive whole numbers) and estimated total; while the market is closed the button is disabled and says why
- [ ] Confirmation dialog: cancel and confirm
- [ ] Buy succeeds: success message with the execution price, wallet falls exactly, holding appears
- [ ] Sell succeeds; selling too many and insufficient balance show the server's message
- [ ] "Your Position" and "Recent Orders" tabs work and refresh after an order
- [ ] Chart range buttons and company information show

### Portfolio (`/portfolio`)
- [ ] Summary cards correct, Refresh works without clearing the page
- [ ] Allocation donut and legend match the holdings
- [ ] Holdings search and sort work; Buy and Sell links open the right form
- [ ] Empty state's button goes to Stocks; error state's Retry works
- [ ] Table on wide screens, cards on narrow screens

### Orders (`/orders`)
- [ ] List loads, pagination works
- [ ] "View details" opens and closes the dialog, in table and card layouts
- [ ] Empty and error states

### Watchlist (`/watchlist`)
- [ ] List loads with prices shown in rupees
- [ ] "View" opens the stock; "Remove" removes it and shows the server's message on failure
- [ ] Empty and error states

### Transactions (`/transactions`)
- [ ] Ledger loads; BUY shows `-₹`, SELL shows `+₹`
- [ ] Pagination; a failed page change keeps the rows and shows the banner
- [ ] Empty state's button and error state's Retry

### Account (`/account`)
- [ ] All five sections open and close independently
- [ ] Personal: edit name, save, cancel, validation; navbar updates at once
- [ ] Photo: pick, crop, confirm, cancel, remove, full-size preview, "Change photo", wrong type and too-large errors
- [ ] Security: change password (wrong current, same password, success), other devices signed out, Log out
- [ ] Trading account: balance loads when first opened, Retry works
- [ ] Danger zone: wrong password error, cancel, delete, then the message on the login page
