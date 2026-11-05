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

### Phase 2. Shared components (`feature/ui-components`)
Restyle Button, Input, Card, Badge, Modal, Pagination, EmptyState and LoadingSpinner. Add Table, price-change and loading-skeleton components. **Done when** they are in use and every page still works.
*Learn:* component APIs and variants, keeping props stable, focus states.

### Phase 3. App layout (`feature/ui-app-shell`)
Icon rail instead of the sidebar, market strip, restyled navbar dropdowns, mobile navigation, pages loaded on demand. The sidebar collapse button goes away on purpose. **Done when** the Navigation and Navbar sections of the checklist pass.
*Learn:* CSS grid app layouts, route-level code splitting, accessible navigation.

### Phase 4. Simulated market (`feature/simulated-market`)
Backend: a market-hours module, a provider module that a real vendor can replace later, a price job that moves `Stock.currentPrice` only while the market is open, a holiday list, orders rejected while the market is closed, previous close and daily change, stored candles with backfilled history, tests. Frontend: polling hook and "Simulated" badge. **Done when** prices move during market hours and hold outside them, and orders and P&L stay correct.
*Learn:* random-walk price models, background jobs, time zones (IST), the provider pattern, polling costs.

### Phase 5. Landing and auth (`feature/landing-page`)
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

- **Phase 2:** `<Button block>` passes `block` to the DOM and React warns ("non-boolean attribute"); make it a proper prop.
- **Phase 3:** the Sidebar's collapse arrow button goes away with the icon rail; Login's "Forgot password?" links to a page that does not exist.
- **Phase 6:** the Stocks page pagination lists every page number and scrolls sideways once there are many pages (found with 34 pages); it needs ellipsis truncation. The header Buy button is marigold while the Place Order panel's Buy is green: pick one meaning (green = buy).
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
- [ ] Sign up and log in buttons open the right pages
- [ ] Reduced-motion and phone fallbacks work

### Login (`/login`)
- [ ] Field validation messages show
- [ ] Wrong password shows the server's message
- [ ] Correct login opens the dashboard
- [ ] Show/hide password works
- [ ] Messages after sign-up, account deletion, idle sign-out and expired session all show
- [ ] "Create an account" link works
- [ ] Known bug before the redesign: "Forgot password?" links to `/forgot-password`, which does not exist

### Signup (`/signup`)
- [ ] Validation, including passwords that do not match
- [ ] Email already in use shows the server's message
- [ ] Success goes to login with a message, and a new account gets the welcome notification

### Navigation (sidebar or rail)
- [ ] Every link opens its page: Dashboard, Stocks, Portfolio, Orders, Watchlist, Transactions
- [ ] The active page is highlighted
- [ ] Phone: the menu opens and closes, including by tapping outside

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

### Dashboard (`/dashboard`)
- [ ] Account summary figures load, and the error state's reload works
- [ ] Portfolio performance section shows
- [ ] Market overview shows NIFTY and SENSEX; Refresh and retry work
- [ ] Watchlist preview: "View all", browse stocks when empty, Retry
- [ ] Recent activity: "View all", browse stocks when empty, Retry

### Stocks (`/stocks`)
- [ ] List loads; search, exchange filter and sort work
- [ ] `?search=` in the URL filters the list, and typing updates the URL
- [ ] Pagination works and returns to page 1 when filters change
- [ ] Watchlist bookmark adds and removes, in table and card layouts
- [ ] Stock links and arrows open details
- [ ] Table on wide screens, cards on narrow screens

### Stock details (`/stocks/:id`)
- [ ] Header shows name, symbol, exchange, price
- [ ] Watchlist button toggles, and a failure shows the banner
- [ ] Header Buy and Sell switch the form and scroll to it
- [ ] `?action=sell` opens on the Sell form
- [ ] Quantity validation (positive whole numbers) and estimated total
- [ ] Confirmation dialog: cancel and confirm
- [ ] Buy succeeds: success message, wallet falls, holding appears
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
