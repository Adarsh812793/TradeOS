import { addMoney, lineTotal, subtractMoney, sumMoney } from "../../utils/money.js";
import { getTradingDay, isTradingDay } from "../market/market.hours.js";

// Rebuilds how an account's value changed day by day, from today's state plus the trade ledger. This file is PURE:
// data in, history out, no database, no clock, so every edge case can be unit tested.
//
// The idea: the database knows the present (holdings and wallet) and every trade (the ledger), but never stored the
// past. So we start from today and walk BACKWARDS one trading day at a time. For each day we value the position we
// have at that moment (cash + shares x that day's close), then UNDO that day's trades to get the evening before:
//   undo a BUY:  shares go down by the quantity, cash goes UP by what it cost
//   undo a SELL: shares go up by the quantity, cash goes DOWN by what it brought in
// Going backwards means the newest point is today's real state by construction, so it can never drift from the
// portfolio and wallet the rest of the app shows.

const DAY_MS = 24 * 60 * 60 * 1000;

// The IST trading days from `fromDate` to `toDate` (both "YYYY-MM-DD", inclusive), oldest first.
// Weekends and exchange holidays are left out, exactly like the daily candles.
export function listTradingDays(fromDate, toDate) {
  const days = [];
  const end = Date.parse(`${toDate}T00:00:00Z`);

  for (let time = Date.parse(`${fromDate}T00:00:00Z`); time <= end; time += DAY_MS) {
    const date = new Date(time).toISOString().slice(0, 10);

    if (isTradingDay(date)) days.push(date);
  }

  return days;
}

// The index of the last entry of a sorted list of date strings that is on or before `day`, or -1 when none is
function lastIndexOnOrBefore(sortedDates, day) {
  let low = 0;
  let high = sortedDates.length - 1;
  let found = -1;

  while (low <= high) {
    const middle = (low + high) >> 1;

    if (sortedDates[middle] <= day) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return found;
}

// Rebuilds the history.
//   holdings      today's shares: [{ stockId, quantity }]
//   cash          today's wallet balance
//   transactions  every trade of the user (any order): [{ stockId, type: "BUY" | "SELL", quantity, executionPrice,
//                 totalValue, executedAt }]
//   closes        daily closing prices: { [stockId]: { "2026-11-09": 1543.2, ... } }. Include today's date with the
//                 stock's current price, so today's value is the same number the portfolio page shows.
//   stockIds      the stocks that still exist; trades of any other stock still move cash but are never valued,
//                 the same way the portfolio page skips a deleted stock
//   days          the trading days to report, oldest first (see listTradingDays)
// Returns { firstTradeDate, points: [{ date, holdingsValue, cash, totalValue, estimated }] } oldest first.
//   estimated is true when a day had no close for a stock we held, not even an earlier one, so the price of our own
//   latest trade in it was used instead.
export function rebuildHistory({ holdings, cash, transactions, closes, stockIds, days }) {
  const known = new Set(stockIds.map(String));

  // Newest trade first, with the IST day it happened on
  const trades = transactions
    .map((transaction) => ({
      ...transaction,
      stockId: String(transaction.stockId),
      date: getTradingDay(new Date(transaction.executedAt)),
    }))
    .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));

  if (trades.length === 0) return { firstTradeDate: null, points: [] };

  const firstTradeDate = trades[trades.length - 1].date;

  // The closing dates of each stock, sorted, for "the latest close on or before this day"
  const closeDates = {};
  for (const [stockId, byDate] of Object.entries(closes)) {
    closeDates[stockId] = Object.keys(byDate).sort();
  }

  // The price of one stock on one day: that day's close, else the latest earlier close, else our latest trade's price
  function priceOn(stockId, day) {
    const dates = closeDates[stockId] ?? [];
    const index = lastIndexOnOrBefore(dates, day);

    if (index >= 0) return { price: closes[stockId][dates[index]], estimated: false };

    const ownTrades = trades.filter((trade) => trade.stockId === stockId);
    const latest = ownTrades.find((trade) => trade.date <= day) ?? ownTrades[ownTrades.length - 1];

    return { price: latest.executionPrice, estimated: true };
  }

  // The state we walk backwards from: today's shares and cash
  const quantities = new Map();
  for (const holding of holdings) {
    if (known.has(String(holding.stockId))) quantities.set(String(holding.stockId), holding.quantity);
  }
  let runningCash = cash;

  // Takes one trade back
  function undo(trade) {
    runningCash =
      trade.type === "BUY"
        ? addMoney(runningCash, trade.totalValue)
        : subtractMoney(runningCash, trade.totalValue);

    if (!known.has(trade.stockId)) return;

    const held = quantities.get(trade.stockId) ?? 0;
    quantities.set(trade.stockId, trade.type === "BUY" ? held - trade.quantity : held + trade.quantity);
  }

  const points = [];
  let nextTrade = 0;

  for (let index = days.length - 1; index >= 0; index--) {
    const day = days[index];

    // Everything that happened after this day has not happened yet at the end of this day
    while (nextTrade < trades.length && trades[nextTrade].date > day) {
      undo(trades[nextTrade]);
      nextTrade++;
    }

    // Before the first trade there is no account history to show
    if (day < firstTradeDate) continue;

    let estimated = false;
    const rows = [];

    for (const [stockId, quantity] of quantities) {
      if (quantity <= 0) continue;

      const found = priceOn(stockId, day);
      estimated = estimated || found.estimated;
      rows.push(lineTotal(found.price, quantity));
    }

    const holdingsValue = sumMoney(rows);

    points.push({
      date: day,
      holdingsValue,
      cash: runningCash,
      totalValue: addMoney(holdingsValue, runningCash),
      estimated,
    });
  }

  return { firstTradeDate, points: points.reverse() };
}
