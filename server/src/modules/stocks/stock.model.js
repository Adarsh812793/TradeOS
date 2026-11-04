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
        }
    },
    { timestamps: true }
);

const Stock = mongoose.model("Stock", stockSchema);

export default Stock;