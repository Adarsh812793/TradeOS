import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
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

        price: {
            type: Number,
            required: true,
            min: 0
        },

        totalValue: {
            type: Number,
            required: true,
            min: 0
        },

        status: {
            type: String,
            enum: ["PENDING", "EXECUTED", "REJECTED"],
            default: "PENDING"
        },

        rejectionReason: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;