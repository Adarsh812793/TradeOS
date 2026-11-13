import { describe, it, expect } from "vitest";

import { listTradingDays, rebuildHistory } from "../src/modules/portfolio/portfolio.history.js";
import { addMoney, lineTotal, subtractMoney, sumMoney } from "../src/utils/money.js";

// Pure unit tests of the history reconstruction: no database. 2026-11-10 is an exchange holiday (Diwali
// Balipratipada) and 7-8 November is a weekend, so DAYS has 9 trading days.
const DAYS = listTradingDays("2026-11-02", "2026-11-13");

// One ledger row. `hour` orders two trades on the same day (05:00 UTC is 10:30 IST).
const trade = (type, stockId, quantity, price, day, hour = 5) => ({
  stockId,
  type,
  quantity,
  executionPrice: price,
  totalValue: lineTotal(price, quantity),
  executedAt: new Date(`${day}T0${hour}:00:00Z`),
});

// A close for every trading day, rising by `step` a day from `start`
function closesFrom(start, step, days = DAYS) {
  return Object.fromEntries(days.map((day, index) => [day, start + step * index]));
}

describe("listTradingDays", () => {
  it("leaves out weekends and exchange holidays", () => {
    expect(DAYS).toEqual([
      "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06",
      "2026-11-09", "2026-11-11", "2026-11-12", "2026-11-13",
    ]);
  });
});

describe("rebuildHistory", () => {
  it("returns no history for a user with no trades", () => {
    const result = rebuildHistory({
      holdings: [], cash: 100000, transactions: [], closes: {}, stockIds: [], days: DAYS,
    });

    expect(result).toEqual({ firstTradeDate: null, points: [] });
  });

  it("starts on the day of the first trade and values the shares at each day's close", () => {
    // Bought 10 shares at 100 on 4 Nov and held them; the stock closed 100, 110, ... 160 on the 7 days since
    const days = DAYS.filter((day) => day >= "2026-11-04");
    const closes = { A: closesFrom(100, 10, days) };

    const { firstTradeDate, points } = rebuildHistory({
      holdings: [{ stockId: "A", quantity: 10 }],
      cash: 99000,
      transactions: [trade("BUY", "A", 10, 100, "2026-11-04")],
      closes,
      stockIds: ["A"],
      days: DAYS,
    });

    expect(firstTradeDate).toBe("2026-11-04");
    expect(points.map((point) => point.date)).toEqual(days);
    expect(points[0]).toEqual({
      date: "2026-11-04", holdingsValue: 1000, cash: 99000, totalValue: 100000, estimated: false,
    });
    expect(points.at(-1)).toEqual({
      date: "2026-11-13", holdingsValue: 1600, cash: 99000, totalValue: 100600, estimated: false,
    });
  });

  it("collapses a buy and a sell on one day into one end-of-day point", () => {
    // 4 Nov: bought 10 at 100, later sold 4 at 110: left with 6 shares and 100000 - 1000 + 440 cash
    const { points } = rebuildHistory({
      holdings: [{ stockId: "A", quantity: 6 }],
      cash: 99440,
      transactions: [
        trade("BUY", "A", 10, 100, "2026-11-04", 4),
        trade("SELL", "A", 4, 110, "2026-11-04", 6),
      ],
      closes: { A: { "2026-11-04": 105, "2026-11-13": 105 } },
      stockIds: ["A"],
      days: DAYS,
    });

    expect(points[0].date).toBe("2026-11-04");
    expect(points[0]).toMatchObject({ cash: 99440, holdingsValue: 630, totalValue: 100070 });
    expect(points.filter((point) => point.date === "2026-11-04")).toHaveLength(1);
  });

  it("changes cash and shares on the day of each trade when trades are on different days", () => {
    const { points } = rebuildHistory({
      holdings: [{ stockId: "A", quantity: 10 }, { stockId: "B", quantity: 5 }],
      cash: 98000,
      transactions: [trade("BUY", "A", 10, 100, "2026-11-03"), trade("BUY", "B", 5, 200, "2026-11-05")],
      closes: { A: closesFrom(100, 0), B: closesFrom(200, 0) },
      stockIds: ["A", "B"],
      days: DAYS,
    });

    const byDate = Object.fromEntries(points.map((point) => [point.date, point]));

    expect(points[0].date).toBe("2026-11-03");
    expect(byDate["2026-11-04"]).toMatchObject({ cash: 99000, holdingsValue: 1000 }); // only A so far
    expect(byDate["2026-11-05"]).toMatchObject({ cash: 98000, holdingsValue: 2000 }); // A and B
    // Nothing was gained or lost: buying only moved money from cash into shares
    expect(points.every((point) => point.totalValue === 100000)).toBe(true);
  });

  it("uses the latest earlier close when a day has no candle", () => {
    const { points } = rebuildHistory({
      holdings: [{ stockId: "A", quantity: 10 }],
      cash: 99000,
      transactions: [trade("BUY", "A", 10, 100, "2026-11-03")],
      // No close on 5 and 6 Nov (the server was off): they carry the 4 Nov close forward
      closes: { A: { "2026-11-03": 100, "2026-11-04": 120, "2026-11-09": 130, "2026-11-13": 140 } },
      stockIds: ["A"],
      days: DAYS,
    });

    const byDate = Object.fromEntries(points.map((point) => [point.date, point]));

    expect(byDate["2026-11-05"].holdingsValue).toBe(1200);
    expect(byDate["2026-11-06"].holdingsValue).toBe(1200);
    expect(byDate["2026-11-11"].holdingsValue).toBe(1300);
    expect(points.some((point) => point.estimated)).toBe(false);
  });

  it("uses the price of the user's own latest trade, and says so, when a stock has no candle yet", () => {
    const { points } = rebuildHistory({
      holdings: [{ stockId: "A", quantity: 10 }],
      cash: 99000,
      transactions: [trade("BUY", "A", 10, 100, "2026-11-03")],
      closes: { A: { "2026-11-12": 150, "2026-11-13": 160 } }, // history only starts on 12 Nov
      stockIds: ["A"],
      days: DAYS,
    });

    const byDate = Object.fromEntries(points.map((point) => [point.date, point]));

    expect(byDate["2026-11-04"]).toMatchObject({ holdingsValue: 1000, estimated: true });
    expect(byDate["2026-11-12"]).toMatchObject({ holdingsValue: 1500, estimated: false });
    expect(byDate["2026-11-13"]).toMatchObject({ holdingsValue: 1600, estimated: false });
  });

  it("has no point on weekends or holidays, and undoes a trade made on one", () => {
    // Dev mode can trade on Saturday 7 Nov: it must not be counted in Friday's evening position
    const { points } = rebuildHistory({
      holdings: [{ stockId: "A", quantity: 15 }],
      cash: 98500,
      transactions: [trade("BUY", "A", 10, 100, "2026-11-06"), trade("BUY", "A", 5, 100, "2026-11-07")],
      closes: { A: closesFrom(100, 0) },
      stockIds: ["A"],
      days: DAYS,
    });

    const dates = points.map((point) => point.date);

    expect(dates).not.toContain("2026-11-07");
    expect(dates).not.toContain("2026-11-08");
    expect(dates).not.toContain("2026-11-10");

    const friday = points.find((point) => point.date === "2026-11-06");
    expect(friday).toMatchObject({ cash: 99000, holdingsValue: 1000 }); // the Saturday buy is not in it yet

    const monday = points.find((point) => point.date === "2026-11-09");
    expect(monday).toMatchObject({ cash: 98500, holdingsValue: 1500 });
  });

  it("values a stock that was fully sold, and stops valuing it after the sale", () => {
    // Held A from 3 Nov to 5 Nov, then sold everything at a profit: it is not in today's holdings at all
    const { points } = rebuildHistory({
      holdings: [],
      cash: 100200,
      transactions: [trade("BUY", "A", 10, 100, "2026-11-03"), trade("SELL", "A", 10, 120, "2026-11-05")],
      closes: { A: closesFrom(100, 5) },
      stockIds: ["A"],
      days: DAYS,
    });

    const byDate = Object.fromEntries(points.map((point) => [point.date, point]));

    expect(byDate["2026-11-04"]).toMatchObject({ cash: 99000, holdingsValue: 1100 }); // 10 x the 4 Nov close (110)
    expect(byDate["2026-11-05"]).toMatchObject({ cash: 100200, holdingsValue: 0, totalValue: 100200 });
    expect(points.at(-1).totalValue).toBe(100200);
  });

  it("never values a deleted stock but still counts the cash it moved", () => {
    // X (since deleted) was bought for 1000 on 3 Nov; A for 500 on 5 Nov. Only A exists today.
    const { points } = rebuildHistory({
      holdings: [{ stockId: "A", quantity: 5 }],
      cash: 98500,
      transactions: [trade("BUY", "X", 10, 100, "2026-11-03"), trade("BUY", "A", 5, 100, "2026-11-05")],
      closes: { A: closesFrom(100, 0) },
      stockIds: ["A"],
      days: DAYS,
    });

    const byDate = Object.fromEntries(points.map((point) => [point.date, point]));

    expect(byDate["2026-11-03"]).toMatchObject({ holdingsValue: 0, cash: 99000, totalValue: 99000 });
    expect(byDate["2026-11-05"]).toMatchObject({ holdingsValue: 500, cash: 98500 });
  });

  it("matches an independent forward replay from the starting 1,00,000 to the paisa", () => {
    // Odd prices on purpose: 3 x 2850.05 is the classic float trap
    const ledger = [
      trade("BUY", "A", 10, 100.1, "2026-11-03"),
      trade("BUY", "B", 3, 2850.05, "2026-11-04"),
      trade("SELL", "A", 3, 120.35, "2026-11-06", 4),
      trade("BUY", "A", 2, 130.2, "2026-11-06", 6),
      trade("SELL", "B", 3, 2861.15, "2026-11-12"),
    ];
    const closes = { A: closesFrom(100.1, 3.3), B: closesFrom(2850.05, 7.15) };

    // Forward replay: start from the signup balance and apply the trades day by day (the opposite direction)
    let cash = 100000;
    const quantities = { A: 0, B: 0 };
    const expected = [];

    for (const day of DAYS) {
      for (const entry of ledger.filter((item) => item.executedAt.toISOString().slice(0, 10) === day)) {
        quantities[entry.stockId] += entry.type === "BUY" ? entry.quantity : -entry.quantity;
        cash = entry.type === "BUY" ? subtractMoney(cash, entry.totalValue) : addMoney(cash, entry.totalValue);
      }

      if (day < "2026-11-03") continue;

      const holdingsValue = sumMoney(
        Object.entries(quantities).map(([stockId, quantity]) => lineTotal(closes[stockId][day], quantity))
      );
      expected.push({ date: day, holdingsValue, cash, totalValue: addMoney(holdingsValue, cash), estimated: false });
    }

    // The backwards function gets only today's end state of that replay
    const { points } = rebuildHistory({
      holdings: Object.entries(quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([stockId, quantity]) => ({ stockId, quantity })),
      cash,
      transactions: ledger,
      closes,
      stockIds: ["A", "B"],
      days: DAYS,
    });

    expect(points).toEqual(expected);
  });
});
