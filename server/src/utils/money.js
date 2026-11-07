// The one place for money maths. JavaScript numbers are binary floats, so 0.1 + 0.2 is 0.30000000000000004.
// Rule: do the arithmetic on WHOLE PAISE (integers, exact) and convert back to rupees only at the edge.
// Amounts stay plain Numbers in MongoDB (no migration); every value is rounded to 2 decimals before it is saved.

// Rupees -> whole paise. toPrecision(15) removes float dust first (1.005 * 100 = 100.49999999999999 would round wrong).
export const toPaise = (rupees) => Math.round(Number((rupees * 100).toPrecision(15)));

// Whole paise -> rupees
export const fromPaise = (paise) => paise / 100;

// Rounds any rupee amount to 2 decimals (the only way to store a wallet balance or a total)
export const roundMoney = (rupees) => fromPaise(toPaise(rupees));

// price x quantity as exact rupees: the integer product of paise and shares, converted once
export const lineTotal = (price, quantity) => fromPaise(toPaise(price) * quantity);

// a - b as exact rupees (for balances and profit/loss)
export const subtractMoney = (a, b) => fromPaise(toPaise(a) - toPaise(b));

// a + b as exact rupees
export const addMoney = (a, b) => fromPaise(toPaise(a) + toPaise(b));

// Sum of many amounts as exact rupees (adds whole paise, so the total always equals the rows shown)
export const sumMoney = (amounts) => fromPaise(amounts.reduce((total, amount) => total + toPaise(amount), 0));

// Can `balance` pay `cost`? Compared in whole paise, so spending exactly your whole balance works
export const canAfford = (balance, cost) => toPaise(balance) >= toPaise(cost);

// A per-share RATE (average buy price) keeps 6 decimals: rounding it to paise would distort the cost of big holdings
export const roundRate = (rate) => Number(rate.toFixed(6));

// Snaps a price to the exchange tick size (₹0.05 for most Indian stocks), using integer paise
export const roundToTick = (price, tickPaise = 5) =>
  fromPaise(Math.round(toPaise(price) / tickPaise) * tickPaise);
