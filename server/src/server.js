import config from "./config/env.js";
import app from "./app.js";
import connectDB from "./database/connection.js";

const PORT = config.PORT;

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`TradeOS server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();