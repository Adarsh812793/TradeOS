import mongoose from "mongoose";

const holdingSchema = new mongoose.Schema(
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

        quantity: {
            type: Number,
            required: true,
            min: 0
        },

        averageBuyPrice: {
            type: Number,
            required: true,
            min: 0
        }
    },
    { timestamps: true }
);

holdingSchema.index(
    { userId: 1, stockId: 1 },
    { unique: true }
);

const Holding = mongoose.model("Holding", holdingSchema);

export default Holding;