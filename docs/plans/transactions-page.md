# Transactions Page Plan

Read-only ledger of every executed buy and sell. Same look and structure as the Orders page (light theme, table on wide screens, cards on narrow ones).

## Scope

Ledger only. No filters, no summary cards. Those need backend support first:
- type / date / search filters: query params on `GET /api/transactions`
- total bought / total sold / net cash flow: a new `GET /api/transactions/summary` (the page only ever holds one page of rows, so it cannot add up the rest)

## Data

`GET /api/transactions?page=&limit=` (newest first, already existed) returns `{ items, pagination }`. Each item: `type` (BUY / SELL), `quantity`, `executionPrice`, `totalValue`, `executedAt`, populated `stockId` (symbol, companyName, currency).

Today every order executes instantly, so a transaction mirrors its order. The ledger framing is what differs: BUY shows `-₹5,000.00` (money out), SELL shows `+₹5,000.00` (money in). Amounts are neutral text; BUY / SELL badges keep the Orders colours (green / red).

## Structure

```
pages/TransactionsPage.jsx (+ .css)      loading, first-load error + Try again, empty state, banner for failed page change
features/transactions/
  transactions.api.js                    getTransactions({ page, limit })
  hooks/useTransactions.js               10 per page; keeps requested page separate from the server's pagination
  utils/transactions.utils.js            formatSignedAmount, getTypeBadgeVariant
  components/
    TransactionsHeader                   title + count
    TransactionsTable / TransactionRow   table below; cards under 1000px
    TransactionCard                      tablet / phone version
```

## Shared code created or moved along the way

- `client/src/components/ui/Pagination.jsx`: the Orders pagination made generic (`itemLabel` prop). Orders now uses it too. The old file used tokens that do not exist (`--spacing-*`, `--color-bg-subtle`), fixed here.
- `client/src/utils/date.utils.js`: `formatDateTime` (was `formatOrderDate` in the Orders utils, which is deleted).

## Behaviour worth knowing

- Changing page keeps the current rows on screen (faded) instead of replacing the page with "Loading...".
- If a page change fails, the old rows and their pagination stay, with an error banner above.

## Verification

Headless Edge with a mock API: no horizontal overflow at 1440 / 1024 / 900 / 390px; page 2 loads correctly; empty account, first-load failure and failed page change all behave as above. Orders page re-checked after the Pagination change. Server code was not changed.

## Done

- [x] API, hook, utils
- [x] Table, rows, cards, header
- [x] Page states, router, shared Pagination and date helper
