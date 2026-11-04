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

const seedStocks = async () => {

    try {

        await connectDB();

        // Remove existing stock documents
        await Stock.deleteMany({});

        // Insert dummy stocks
        await Stock.insertMany(stocks);

        console.log("Stock data seeded successfully");

    } catch (error) {

        console.error("Stock seeding failed:", error);

    } finally {

        // Close MongoDB connection
        await mongoose.connection.close();

        console.log("MongoDB connection closed");
    }
};


seedStocks();