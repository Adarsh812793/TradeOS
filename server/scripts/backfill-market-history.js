// One-time, SAFE script: gives every stock a year of synthetic price history (daily candles) plus 14 days of 5-minute
// candles, and fills in previousClose / tradingDay where they are missing.
//
//   node scripts/backfill-market-history.js                                   DRY RUN: prints the plan, writes nothing
//   node scripts/backfill-market-history.js --apply --confirm-db=<name>       writes (the name must match the database)
//   NODE_ENV=test node scripts/backfill-market-history.js ...                 same, against the TEST database
//
// Safety rules (each one is tested in tests/backfill.test.js):
//   - dry run by default; writing needs --apply AND the exact database name
//   - refuses to run when NODE_ENV is "production"
//   - only INSERTS candles ($setOnInsert upserts): it never updates or deletes anything that exists
//   - a stock that already has any candles is skipped, so running it twice changes nothing
//   - never touches currentPrice, users, wallets, holdings, orders or transactions (it counts them before and after)
//   - the random numbers are seeded per stock, so the dry run shows exactly what --apply would write
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";

import config from "../src/config/env.js";
import Stock from "../src/modules/stocks/stock.model.js";
import Candle from "../src/modules/candles/candle.model.js";
import User from "../src/modules/users/user.model.js";
import Wallet from "../src/modules/wallet/wallet.model.js";
import Holding from "../src/modules/holdings/holding.model.js";
import Order from "../src/modules/orders/order.model.js";
import Transaction from "../src/modules/transactions/transaction.model.js";
import { nextPrice } from "../src/modules/prices/simulated.provider.js";
import { FIVE_MINUTE_RETENTION_MS } from "../src/modules/candles/candle.service.js";
import { getTradingDay, isTradingDay, istMidnight, MARKET_OPEN_MINUTE } from "../src/modules/market/market.hours.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 365; // calendar days of daily candles
const SLOTS_PER_DAY = 1500; // 15-second steps in the 6.25-hour trading day
const SLOTS_PER_CANDLE = 20; // 20 x 15 s = 5 minutes
const CANDLES_PER_DAY = SLOTS_PER_DAY / SLOTS_PER_CANDLE; // 75

// A small seeded random generator (mulberry32): the same seed always gives the same numbers
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A number made from a text (the stock symbol), to seed the generator
const hashText = (text) => [...text].reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) | 0, 7);

// "2026-11-09" minus n days
const dateMinusDays = (dateString, n) => new Date(Date.parse(`${dateString}T00:00:00Z`) - n * DAY_MS).toISOString().slice(0, 10);

// The trading days before today within the history window, oldest first
function listTradingDays(now) {
  const today = getTradingDay(now);
  const days = [];

  for (let back = HISTORY_DAYS; back >= 1; back--) {
    const day = dateMinusDays(today, back);
    if (isTradingDay(day)) days.push(day);
  }

  return days;
}

// Builds the history for ONE stock as plain data (no database access). It is ONE continuous random walk of 15-second
// prices generated BACKWARDS in time, starting from today's price: so the newest history ends exactly at the live price
// and the chart joins up, and the daily and 5-minute candles are two summaries of the same path.
//   returns { tradingDay, previousClose, daily: [...], fiveMinute: [...] } or null when there are no trading days
export function planHistory(stock, { now = new Date() } = {}) {
  const days = listTradingDays(now);
  if (days.length === 0) return null;

  const random = seededRandom(hashText(stock.symbol));
  let price = stock.currentPrice;
  const history = []; // newest day first while building

  for (let index = days.length - 1; index >= 0; index--) {
    const slots = new Array(SLOTS_PER_DAY);

    for (let slot = SLOTS_PER_DAY - 1; slot >= 0; slot--) {
      slots[slot] = price;
      price = nextPrice({ price, previousClose: null, random }); // one step further back in time
    }

    history.push({ date: days[index], slots });
  }
  history.reverse(); // oldest first

  const summarise = (slots) => ({ open: slots[0], high: Math.max(...slots), low: Math.min(...slots), close: slots[slots.length - 1] });
  const fiveMinuteSince = now.getTime() - FIVE_MINUTE_RETENTION_MS;

  const daily = [];
  const fiveMinute = [];

  for (const { date, slots } of history) {
    const dayStart = istMidnight(date).getTime();
    daily.push({ bucketStart: new Date(dayStart), ...summarise(slots) });

    for (let candle = 0; candle < CANDLES_PER_DAY; candle++) {
      const bucketStart = dayStart + (MARKET_OPEN_MINUTE + candle * 5) * 60 * 1000;
      if (bucketStart < fiveMinuteSince) continue;

      fiveMinute.push({
        bucketStart: new Date(bucketStart),
        expireAt: new Date(bucketStart + FIVE_MINUTE_RETENTION_MS),
        ...summarise(slots.slice(candle * SLOTS_PER_CANDLE, (candle + 1) * SLOTS_PER_CANDLE)),
      });
    }
  }

  // previousClose belongs to the last history day: the close of the day before it
  const last = history[history.length - 1];
  const dayBefore = history[history.length - 2];

  return {
    tradingDay: last.date,
    previousClose: dayBefore ? dayBefore.slots[SLOTS_PER_DAY - 1] : last.slots[0],
    daily,
    fiveMinute,
  };
}

// How many documents each user-owned collection holds, plus every stock's current price: compared before and after
async function takeSnapshot() {
  const [users, wallets, holdings, orders, transactions, stocks] = await Promise.all([
    User.countDocuments(), Wallet.countDocuments(), Holding.countDocuments(), Order.countDocuments(), Transaction.countDocuments(),
    Stock.find().select("currentPrice").sort({ _id: 1 }).lean(),
  ]);

  return { users, wallets, holdings, orders, transactions, prices: stocks.map((s) => `${s._id}:${s.currentPrice}`).join("|") };
}

// Throws when anything the backfill must never touch has changed between two snapshots
export function assertSnapshotsMatch(before, after) {
  const changed = Object.keys(before).filter((key) => before[key] !== after[key]);
  if (changed.length > 0) {
    throw new Error(`SAFETY CHECK FAILED: ${changed.join(", ")} changed during the backfill. Investigate now.`);
  }
}

// Plans (and, with apply = true, writes) the history. `filter` limits which stocks are touched (tests use it).
// `checkUserData` (on by default) compares whole-database counts before and after; tests turn it off because other
// test files write to the same database at the same moment. Returns a report; the caller decides how to print it.
export async function runBackfill({ apply = false, confirmDb = null, now = new Date(), filter = {}, checkUserData = true } = {}) {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to run in production.");

  const database = mongoose.connection.name;
  if (apply && confirmDb !== database) {
    throw new Error(`--confirm-db must be exactly "${database}" (the database this script is connected to) to write.`);
  }

  const before = checkUserData ? await takeSnapshot() : null;
  const stocks = await Stock.find({ ...filter, isActive: true }).sort({ symbol: 1 });
  const report = { database, apply, stocks: [], before, after: null };

  if (apply) await Candle.init(); // make sure the unique and expiry indexes exist before inserting

  for (const stock of stocks) {
    const hasCandles = await Candle.exists({ stockId: stock._id });
    if (hasCandles) {
      report.stocks.push({ symbol: stock.symbol, skipped: "already has candles" });
      continue;
    }

    const plan = planHistory(stock, { now });
    if (!plan) {
      report.stocks.push({ symbol: stock.symbol, skipped: "no trading days in range" });
      continue;
    }

    const fillFields = stock.previousClose == null && stock.tradingDay == null;
    report.stocks.push({
      symbol: stock.symbol,
      currentPrice: stock.currentPrice,
      dailyCandles: plan.daily.length,
      fiveMinuteCandles: plan.fiveMinute.length,
      tradingDay: fillFields ? plan.tradingDay : stock.tradingDay,
      previousClose: fillFields ? plan.previousClose : stock.previousClose,
      fieldsFilled: fillFields,
    });

    if (!apply) continue;

    // Inserts only: $setOnInsert changes nothing that already exists
    const insert = (interval, candle) => ({
      updateOne: {
        filter: { stockId: stock._id, interval, bucketStart: candle.bucketStart },
        update: { $setOnInsert: { ...candle, stockId: stock._id, interval, synthetic: true } },
        upsert: true,
      },
    });
    await Candle.bulkWrite(
      [...plan.daily.map((c) => insert("1d", c)), ...plan.fiveMinute.map((c) => insert("5m", c))],
      { ordered: false }
    );

    if (fillFields) {
      // Only when BOTH are still empty, so live data written by the price job is never overwritten
      await Stock.updateOne(
        { _id: stock._id, previousClose: null, tradingDay: null },
        { $set: { previousClose: plan.previousClose, tradingDay: plan.tradingDay } }
      );
    }
  }

  if (apply && checkUserData) {
    report.after = await takeSnapshot();
    assertSnapshotsMatch(before, report.after);
  }

  return report;
}

// Hides the username and password of a connection string for printing
const describeConnection = (uri) => uri.replace(/\/\/[^@/]*@/, "//***@").replace(/\?.*$/, "");

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const confirmDb = args.find((arg) => arg.startsWith("--confirm-db="))?.split("=")[1] ?? null;

  await mongoose.connect(config.MONGODB_URI); // no model.init here: a dry run must not create anything

  console.log("Connection:  ", describeConnection(config.MONGODB_URI));
  console.log("Database:    ", mongoose.connection.name);
  console.log("Environment: ", config.NODE_ENV, `(${process.env.NODE_ENV === "test" ? ".env.test" : ".env"})`);
  console.log("Mode:        ", apply ? "APPLY (writes)" : "DRY RUN (writes nothing)");
  console.log("");

  try {
    const report = await runBackfill({ apply, confirmDb });

    console.table(report.stocks);
    const planned = report.stocks.filter((s) => !s.skipped);
    console.log(`Stocks to backfill: ${planned.length}, skipped: ${report.stocks.length - planned.length}`);
    console.log(`Daily candles: ${planned.reduce((n, s) => n + s.dailyCandles, 0)}, 5-minute candles: ${planned.reduce((n, s) => n + s.fiveMinuteCandles, 0)}`);
    console.log("Collections that will be read but NEVER written: users, wallets, holdings, orders, transactions.");
    console.log("Before:", { ...report.before, prices: "(list of current prices)" });

    if (apply) console.log("After: ", { ...report.after, prices: "(unchanged)" }, "\nSafety check passed: user data and prices are unchanged.");
    else console.log(`\nNothing was written. To apply: node scripts/backfill-market-history.js --apply --confirm-db=${mongoose.connection.name}`);
  } finally {
    await mongoose.disconnect();
  }
}

// Run main() only when started from the command line, not when a test imports this file
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Backfill failed:", error.message);
    process.exit(1);
  });
}
