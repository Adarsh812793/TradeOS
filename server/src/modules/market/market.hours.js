import { HOLIDAYS } from "./market.holidays.js";

// Indian market hours: weekdays 9:15 AM to 3:30 PM IST, except exchange holidays.
// IST is a fixed UTC+5:30 with no daylight saving, so plain arithmetic is exact: shift the clock by 5h30m, then read
// the UTC fields. Nothing here depends on the server's own timezone, so it behaves the same on a laptop in India
// and on a cloud server running UTC.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const MARKET_OPEN_MINUTE = 9 * 60 + 15; // 9:15 AM
export const MARKET_CLOSE_MINUTE = 15 * 60 + 30; // 3:30 PM (the market is closed from this exact minute)

const warnedYears = new Set();

// Splits an instant into its IST calendar date ("2026-11-09"), weekday (0 = Sunday) and minutes since IST midnight
function istParts(instant) {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MS);
  const iso = shifted.toISOString();

  return {
    date: iso.slice(0, 10),
    weekday: shifted.getUTCDay(),
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

// The IST calendar date of an instant: this is the "trading day" label stored on stocks and candles
export const getTradingDay = (instant = new Date()) => istParts(instant).date;

// The holiday's name when the IST date is an exchange holiday, otherwise null.
// A year with no list yet logs one warning and counts as having no holidays.
function holidayName(dateString) {
  const year = Number(dateString.slice(0, 4));
  const yearList = HOLIDAYS[year];

  if (!yearList) {
    if (!warnedYears.has(year)) {
      warnedYears.add(year);
      console.warn(`[market] No holiday list for ${year} in market.holidays.js: treating weekdays as open.`);
    }
    return null;
  }

  return yearList[dateString] ?? null;
}

// IST midnight (as a UTC instant) at the start of the given IST calendar date ("2026-11-09"): the daily candle's start
export const istMidnight = (dateString) => new Date(Date.parse(`${dateString}T00:00:00Z`) - IST_OFFSET_MS);

// True when the IST calendar date ("2026-11-09") is a weekday that is not an exchange holiday
export function isTradingDay(dateString) {
  const weekday = new Date(`${dateString}T00:00:00Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidayName(dateString);
}

// The instant the market next opens, searching forward from `instant` (a weekend or holiday is skipped)
function findNextOpen(instant) {
  const today = istParts(instant);

  for (let offset = 0; offset < 30; offset++) {
    const dateString = istParts(new Date(istMidnight(today.date).getTime() + offset * DAY_MS)).date;
    const opensAt = new Date(istMidnight(dateString).getTime() + MARKET_OPEN_MINUTE * 60 * 1000);

    if (isTradingDay(dateString) && opensAt > instant) return opensAt;
  }

  return null;
}

// Everything the app needs to know about the market at one instant.
// `alwaysOpen` is the development-only override (MARKET_ALWAYS_OPEN); config decides it, this file stays pure.
// reason: open | before_open | after_close | weekend | holiday | override
export function getMarketStatus(now = new Date(), { alwaysOpen = false } = {}) {
  const { date, weekday, minuteOfDay } = istParts(now);
  const holiday = holidayName(date);
  const isWeekend = weekday === 0 || weekday === 6;

  let reason;
  if (alwaysOpen) reason = "override";
  else if (isWeekend) reason = "weekend";
  else if (holiday) reason = "holiday";
  else if (minuteOfDay < MARKET_OPEN_MINUTE) reason = "before_open";
  else if (minuteOfDay >= MARKET_CLOSE_MINUTE) reason = "after_close";
  else reason = "open";

  const isOpen = reason === "open" || reason === "override";

  return {
    isOpen,
    reason,
    tradingDay: date,
    holidayName: reason === "holiday" ? holiday : null,
    nextOpenAt: isOpen ? null : findNextOpen(now)?.toISOString() ?? null,
  };
}

// True while orders may be placed and prices may move
export const isMarketOpen = (now = new Date(), options) => getMarketStatus(now, options).isOpen;
