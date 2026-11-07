import mongoose from "mongoose";

const stockSchema = new mongoose.Schema(
    {
        symbol: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true
        },

        companyName: {
            type: String,
            required: true,
            trim: true
        },

        exchange: {
            type: String,
            required: true
        },

        currentPrice: {
            type: Number,
            required: true,
            min: 0
        },

        currency: {
            type: String,
            required: true,
            default: "INR"
        },

        isActive: {
            type: Boolean,
            default: true
        },

        // Yesterday's closing price: the base for "today's change". Set by the price job on the first update of
        // each trading day (old stocks without it are filled in then, or by the backfill script).
        previousClose: {
            type: Number,
            min: 0,
            default: null
        },

        // The IST date ("2026-11-09") that previousClose belongs to: when it differs from today, a new day has begun
        tradingDay: {
            type: String,
            default: null
        },

        // When the price job last moved this price. Guards against two job runs moving it in the same 15 s slot
        lastPriceUpdateAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

const Stock = mongoose.model("Stock", stockSchema);

export default Stock;