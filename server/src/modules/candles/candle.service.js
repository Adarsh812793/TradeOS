import Candle from "./candle.model.js";
import stockService from "../stocks/stock.service.js";
import { getTradingDay, istMidnight } from "../market/market.hours.js";

export const FIVE_MINUTES_MS = 5 * 60 * 1000;
export const FIVE_MINUTE_RETENTION_MS = 14 * 24 * 60 * 60 * 1000; // 14 calendar days
const DAY_MS = 24 * 60 * 60 * 1000;

// What each chart range shows: which candles, and how far back (null = everything)
export const RANGES = {
    "1D": { interval: "5m", days: null }, // the latest trading day that has candles (so a weekend still shows Friday)
    "1W": { interval: "5m", days: 7 },
    "1M": { interval: "1d", days: 30 },
    "3M": { interval: "1d", days: 90 },
    "1Y": { interval: "1d", days: 365 },
    "ALL": { interval: "1d", days: null }
};

// Folds fresh price updates into their candles. `updates` is [{ stockId, price }] recorded at `now`.
// Each price touches two candles (its 5-minute bucket and its trading day) with ONE atomic upsert each:
//   $setOnInsert open   the first price seen becomes the open, and is never changed afterwards
//   $max high / $min low   the extremes, decided by MongoDB itself, so no read-then-write race exists
//   $set close          the latest price
// Because the bucket is found by (stock, interval, start), a server restart in the middle of a candle simply
// continues the same candle. If the server was off, the candles for that time are missing: gaps are not invented.
export async function recordCandles(updates, now = new Date()) {
    if (updates.length === 0) return;

    const fiveMinuteStart = new Date(Math.floor(now.getTime() / FIVE_MINUTES_MS) * FIVE_MINUTES_MS);
    const dayStart = istMidnight(getTradingDay(now));

    const upsert = (stockId, price, interval, bucketStart, extraOnInsert = {}) => ({
        updateOne: {
            filter: { stockId, interval, bucketStart },
            update: {
                $setOnInsert: { open: price, synthetic: false, ...extraOnInsert },
                $max: { high: price },
                $min: { low: price },
                $set: { close: price }
            },
            upsert: true
        }
    });

    const operations = updates.flatMap(({ stockId, price }) => [
        upsert(stockId, price, "5m", fiveMinuteStart, { expireAt: new Date(fiveMinuteStart.getTime() + FIVE_MINUTE_RETENTION_MS) }),
        upsert(stockId, price, "1d", dayStart)
    ]);

    await Candle.bulkWrite(operations, { ordered: false });
}

// The candles for a chart range, oldest first. Throws 404 when the stock does not exist.
export async function getCandles(stockId, range, now = new Date()) {
    await stockService.getStockById(stockId);

    const { interval, days } = RANGES[range];
    const filter = { stockId, interval };

    if (range === "1D") {
        // start of the IST day of the newest 5-minute candle
        const latest = await Candle.findOne({ stockId, interval }).sort({ bucketStart: -1 }).select("bucketStart").lean();
        if (!latest) return { range, interval, candles: [] };

        filter.bucketStart = { $gte: istMidnight(getTradingDay(latest.bucketStart)) };
    } else if (days) {
        filter.bucketStart = { $gte: new Date(now.getTime() - days * DAY_MS) };
    }

    const candles = await Candle.find(filter)
        .sort({ bucketStart: 1 })
        .select("bucketStart open high low close synthetic")
        .lean();

    return {
        range,
        interval,
        candles: candles.map(({ bucketStart, open, high, low, close, synthetic }) => ({
            time: bucketStart.toISOString(),
            open,
            high,
            low,
            close,
            synthetic
        }))
    };
}

export default { recordCandles, getCandles };
