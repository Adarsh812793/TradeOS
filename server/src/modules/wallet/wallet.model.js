import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        balance: {
            type: Number,
            required: true,
            default: 100000,
            min: 0
        },

        currency: {
            type: String,
            required: true,
            default: "INR"
        }
    },
    { timestamps: true }
);

const Wallet = mongoose.model("Wallet", walletSchema);

export default Wallet;