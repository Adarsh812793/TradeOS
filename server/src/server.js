import config from "./config/env.js";
import app from "./app.js";
import connectDB from "./database/connection.js";
import { startPriceJob } from "./modules/prices/price.job.js";

const PORT = config.PORT;

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`TradeOS server running on port ${PORT}`);
        });

        // Simulated prices move only while the market is open; nothing happens at other times
        startPriceJob();
        console.log("Price job started (simulated prices, every 15 seconds while the market is open)");
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();