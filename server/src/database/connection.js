import mongoose from "mongoose"
import config from "../config/env.js"

//Async function to form connection between server and mongodb
async function connectDB(){
    try {
        await mongoose.connect(config.MONGODB_URI);
        console.log("MongoDB connected");

        // Wait until every model's collection and indexes exist before any request is served.
        // Otherwise a transaction that writes to a brand-new collection (e.g. the first registration
        // creating a welcome notification) can collide with Mongoose still creating it in the background.
        await Promise.all(
            Object.values(mongoose.models).map((model) => model.init())
        );
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        throw error;
    }
}

export default connectDB;