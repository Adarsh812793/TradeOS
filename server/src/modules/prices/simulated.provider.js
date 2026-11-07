import { roundToTick, toPaise, fromPaise } from "../../utils/money.js";

// A simulated price feed: a "random walk" with realistic volatility. No database, no clock, no config in here:
// just maths on numbers, with the random source passed in so tests can make it repeatable.

export const ANNUAL_VOLATILITY = 0.25; // 25% a year: a typical large Indian stock
export const UPDATE_INTERVAL_SECONDS = 15;

// A trading day is 6.25 hours (9:15 to 3:30) and a year has about 252 trading days
const TRADING_SECONDS_PER_YEAR = 252 * 6.25 * 60 * 60;

// Volatility is a spread per square root of time (the variance of independent steps ADDS UP, so the spread grows
// with sqrt(time)). Scaling 25% a year down to one 15-second step therefore divides by sqrt(number of steps a year):
//   steps per year = 5,670,000 s / 15 s = 378,000  ->  0.25 / sqrt(378,000) = about 0.0407% per step.
// Over a 1,500-step day that adds back up: 0.0407% x sqrt(1,500) = about 1.58%.
export const STEP_VOLATILITY =
  ANNUAL_VOLATILITY / Math.sqrt(TRADING_SECONDS_PER_YEAR / UPDATE_INTERVAL_SECONDS);

// Indian exchanges stop a stock that moves 10% from the previous close in one day (a simplified "circuit limit")
export const DAILY_LIMIT = 0.1;

const TICK_PAISE = 5; // prices move in steps of 5 paise

// A normally distributed random number (mean 0, spread 1) from two uniform ones: the Box-Muller transform
export function randomNormal(random = Math.random) {
  const u1 = 1 - random(); // 1 - random() keeps it above 0, since log(0) is minus infinity
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// The next price after one 15-second step.
//   price = price x exp(sigma x Z - sigma^2 / 2)
// Multiplying (not adding) means moves are percentages and a price can never go negative. The - sigma^2 / 2 term
// cancels the small upward bias that exp() adds, so there is no built-in drift up or down.
// The result is snapped to the 5-paise tick and kept within the daily limit around `previousClose`.
export function nextPrice({ price, previousClose, random = Math.random }) {
  const moved = price * Math.exp(STEP_VOLATILITY * randomNormal(random) - (STEP_VOLATILITY ** 2) / 2);

  const base = previousClose > 0 ? previousClose : price;
  const lowest = Math.max(fromPaise(TICK_PAISE), roundToTick(base * (1 - DAILY_LIMIT)));
  const highest = roundToTick(base * (1 + DAILY_LIMIT));

  // clamp in whole paise so the limits themselves are exact
  const clamped = Math.min(Math.max(toPaise(roundToTick(moved)), toPaise(lowest)), toPaise(highest));
  return fromPaise(clamped);
}

// Builds a provider: the object the price job talks to. Any future real vendor exposes the same two members.
//   name: shown to users ("simulated" becomes the "Simulated" label)
//   getNextPrices(stocks): stocks are { _id, symbol, currentPrice, previousClose }; returns [{ stockId, price }]
export function createSimulatedProvider({ random = Math.random } = {}) {
  return {
    name: "simulated",
    getNextPrices: (stocks) =>
      stocks.map((stock) => ({
        stockId: stock._id,
        price: nextPrice({ price: stock.currentPrice, previousClose: stock.previousClose, random }),
      })),
  };
}
