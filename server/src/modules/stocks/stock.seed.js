import mongoose from "mongoose";
import "dotenv/config";

import Stock from "./stock.model.js";
import connectDB from "../../database/connection.js";


// ==========================================
// DUMMY STOCK DATA
// ==========================================

const stocks = [

    {
        symbol: "RELIANCE",
        companyName: "Reliance Industries Limited",
        exchange: "NSE",
        currentPrice: 2850,
        currency: "INR",
        isActive: true
    },

    {
        symbol: "TCS",
        companyName: "Tata Consultancy Services",
        exchange: "NSE",
        currentPrice: 3850,
        currency: "INR",
        isActive: true
    },

    {
        symbol: "INFY",
        companyName: "Infosys Limited",
        exchange: "NSE",
        currentPrice: 1725,
        currency: "INR",
        isActive: true
    },

    {
        symbol: "HDFCBANK",
        companyName: "HDFC Bank Limited",
        exchange: "NSE",
        currentPrice: 1680,
        currency: "INR",
        isActive: true
    },

    {
        symbol: "ICICIBANK",
        companyName: "ICICI Bank Limited",
        exchange: "NSE",
        currentPrice: 1320,
        currency: "INR",
        isActive: true
    },

    {
        symbol: "SBIN",
        companyName: "State Bank of India",
        exchange: "NSE",
        currentPrice: 820,
        currency: "INR",
        isActive: true
    },

    {
        symbol: "ITC",
        companyName: "ITC Limited",
        exchange: "NSE",
        currentPrice: 510,
        currency: "INR",
        isActive: true
    },

    {
        symbol: "WIPRO",
        companyName: "Wipro Limited",
        exchange: "NSE",
        currentPrice: 540,
        currency: "INR",
        isActive: true
    },

    {
        symbol: "BHARTIARTL",
        companyName: "Bharti Airtel Limited",
        exchange: "NSE",
        currentPrice: 1920,
        currency: "INR",
        isActive: true
    },

    {
        symbol: "LT",
        companyName: "Larsen & Toubro Limited",
        exchange: "NSE",
        currentPrice: 3950,
        currency: "INR",
        isActive: true
    }

];


// ==========================================
// SEED DATABASE
// ==========================================
//   node src/modules/stocks/stock.seed.js
//       SAFE: adds the stocks that are missing (matched by symbol) and never changes or deletes anything else.
//       Run it on a new database, or any time; running it twice does nothing the second time.
//   node src/modules/stocks/stock.seed.js --reset --confirm-db=<database name>
//       DESTRUCTIVE: wipes the whole stocks collection and inserts the list again. Every order and holding points at a
//       stock's id, so after this they point at nothing. Meant for a throwaway development database only, and it refuses
//       unless you type the name of the database it is connected to.
// It connects with the MONGODB_URI of server/.env (a MONGODB_URI given on the command line wins), so check which database it names.

const seedStocks = async () => {

    try {

        await connectDB();

        const databaseName = mongoose.connection.name;

        if (process.argv.includes("--reset")) {
            const confirmed = process.argv.includes(`--confirm-db=${databaseName}`);

            if (!confirmed) {
                throw new Error(`--reset wipes every stock in the database "${databaseName}". Add --confirm-db=${databaseName} to confirm.`);
            }

            await Stock.deleteMany({});
            await Stock.insertMany(stocks);

            console.log(`Stocks reset in "${databaseName}": ${stocks.length} inserted.`);
        } else {
            const result = await Stock.bulkWrite(
                stocks.map((stock) => ({
                    updateOne: {
                        filter: { symbol: stock.symbol },
                        update: { $setOnInsert: stock },
                        upsert: true
                    }
                }))
            );

            console.log(`Stocks in "${databaseName}": ${result.upsertedCount} added, ${stocks.length - result.upsertedCount} already there (left untouched).`);
        }

    } catch (error) {

        console.error("Stock seeding failed:", error.message);
        process.exitCode = 1;

    } finally {

        // Close MongoDB connection
        await mongoose.connection.close();

        console.log("MongoDB connection closed");
    }
};


seedStocks();
