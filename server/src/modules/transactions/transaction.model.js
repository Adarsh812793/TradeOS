import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },

    stockId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Stock",
        required: true
    },

    type: {
        type: String,
        enum: ["BUY", "SELL"],
        required: true
    },

    quantity: {
        type: Number,
        required: true,
        min: 1
    },

    executionPrice: {
        type: Number,
        required: true,
        min: 0
    },

    totalValue: {
        type: Number,
        required: true,
        min: 0
    },

    executedAt: {
        type: Date,
        default: Date.now
    }
});

transactionSchema.index({ userId: 1, executedAt: -1 });

const Transaction = mongoose.model(
    "Transaction",
    transactionSchema
);

export default Transaction;