import config from "../../config/env.js";
import Stock from "../stocks/stock.model.js";
import { getMarketStatus } from "../market/market.hours.js";
import { getPriceProvider } from "./price.provider.js";
import { recordCandles } from "../candles/candle.service.js";

export const PRICE_UPDATE_INTERVAL_MS = 15 * 1000;

// Moves the price of every active stock one step, but only while the market is open. Everything is read from and
// written to MongoDB, never kept in this process, so a restart or a second server cannot lose or repeat a move.
//   now      the instant to use (tests pass their own)
//   provider where the new prices come from (defaults to the configured one)
//   filter   limits which stocks are touched (tests use it so they leave other stocks alone)
// Returns { skipped: reason } when the market is closed, otherwise { updated, unchanged, tradingDay }.
export async function runPriceUpdate({ now = new Date(), provider = getPriceProvider(), filter = {} } = {}) {
  const status = getMarketStatus(now, { alwaysOpen: config.MARKET_ALWAYS_OPEN });
  if (!status.isOpen) return { skipped: status.reason };

  const { tradingDay } = status;
  const stocks = await Stock.find({ ...filter, isActive: true });

  // previousClose for today: kept for the whole day; on the first update of a new trading day it becomes the last
  // price (= yesterday's close, because nothing moves the price while the market is closed)
  const inputs = stocks.map((stock) => ({
    _id: stock._id,
    symbol: stock.symbol,
    currentPrice: stock.currentPrice,
    previousClose:
      stock.tradingDay === tradingDay && stock.previousClose != null ? stock.previousClose : stock.currentPrice,
  }));
  const previousCloseOf = new Map(inputs.map((input) => [String(input._id), input.previousClose]));

  const newPrices = provider.getNextPrices(inputs);

  // Each 15-second slot may move a stock only once. The condition sits INSIDE the write, so if two job runs (this
  // process or another server) race, MongoDB lets exactly one of them through; the other matches nothing.
  const slotStart = new Date(Math.floor(now.getTime() / PRICE_UPDATE_INTERVAL_MS) * PRICE_UPDATE_INTERVAL_MS);

  const results = await Promise.all(
    newPrices.map(({ stockId, price }) =>
      Stock.updateOne(
        {
          _id: stockId,
          $or: [{ lastPriceUpdateAt: null }, { lastPriceUpdateAt: { $lt: slotStart } }],
        },
        {
          $set: {
            currentPrice: price,
            previousClose: previousCloseOf.get(String(stockId)),
            tradingDay,
            lastPriceUpdateAt: now,
          },
        }
      )
    )
  );

  // Only prices that really moved are folded into candles, so a skipped (already moved) slot never counts twice
  const moved = newPrices.filter((_, index) => results[index].modifiedCount === 1);

  try {
    await recordCandles(moved, now);
  } catch (error) {
    // The price itself is already saved; a failed candle write leaves a one-update gap that the next update repairs
    console.error("[prices] candle write failed:", error.message);
  }

  return { updated: moved.length, unchanged: results.length - moved.length, tradingDay };
}
