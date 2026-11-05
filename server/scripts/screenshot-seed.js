// Seeds realistic NSE stocks into the TEST database so the screenshot script has nice-looking data.
// It only adds missing stocks (never wipes), and refuses to run unless NODE_ENV=test.
//   NODE_ENV=test node scripts/screenshot-seed.js            adds the stocks
//   NODE_ENV=test node scripts/screenshot-seed.js --shift    also moves every price by a random -6%..+8%,
//                                                            so profit and loss show real colours
import mongoose from "mongoose";

import config from "../src/config/env.js";
import connectDB from "../src/database/connection.js";
import Stock from "../src/modules/stocks/stock.model.js";

if (config.NODE_ENV !== "test") {
    console.error("Refusing to run: this script only works with NODE_ENV=test (it must never touch real data).");
    process.exit(1);
}

const STOCKS = [
    ["RELIANCE", "Reliance Industries Limited", 2850],
    ["TCS", "Tata Consultancy Services", 3850],
    ["INFY", "Infosys Limited", 1480],
    ["HDFCBANK", "HDFC Bank Limited", 1720],
    ["ICICIBANK", "ICICI Bank Limited", 1195],
    ["SBIN", "State Bank of India", 830],
    ["ITC", "ITC Limited", 465],
    ["BHARTIARTL", "Bharti Airtel Limited", 1640]
];

await connectDB();

// Adds each stock only if its symbol is not there yet
await Stock.bulkWrite(
    STOCKS.map(([symbol, companyName, currentPrice]) => ({
        updateOne: {
            filter: { symbol },
            update: {
                $setOnInsert: { symbol, companyName, exchange: "NSE", currentPrice, currency: "INR", isActive: true }
            },
            upsert: true
        }
    }))
);

if (process.argv.includes("--shift")) {
    for (const [symbol] of STOCKS) {
        const stock = await Stock.findOne({ symbol });
        const change = -0.06 + Math.random() * 0.14;
        stock.currentPrice = Math.round(stock.currentPrice * (1 + change) * 100) / 100;
        await stock.save();
    }
    console.log("Prices shifted.");
}

console.log(`Stocks ready: ${STOCKS.map(([symbol]) => symbol).join(", ")}`);
await mongoose.disconnect();
