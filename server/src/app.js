// 1.Imports

import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser"
import helmet from "helmet"
import config from "./config/env.js";

//routes
import authRoutes from './modules/auth/auth.routes.js'
import userRoutes from "./modules/users/user.routes.js";
import stockRoutes from "./modules/stocks/stock.routes.js";
import walletRoutes from "./modules/wallet/wallet.routes.js";
import orderRoutes from "./modules/orders/order.routes.js"
import holdingRoutes from "./modules/holdings/holding.routes.js";
import transactionRoutes from "./modules/transactions/transaction.routes.js";
import portfolioRoutes from "./modules/portfolio/portfolio.routes.js";
import watchlistRoutes from "./modules/watchlist/watchlist.routes.js";
import marketRoutes from "./modules/market/market.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";

import notfound from './middleware/notfound.middleware.js';
import errorHandler from "./middleware/error.middleware.js";

// 2. Express
const app=express();

//3. Global Middlewares ->CONFIGS 
app.use(express.json({limit:"10kb"})); //Size of json payload for any route cannot exceed 10 kb
app.use(cors({
    origin:config.CORS_ORIGIN,
    credentials:true
}));
app.use(cookieParser())
app.use(helmet());


//4. Routes
app.get('/',(req,res)=>{
    res.send("Get request was sent on root endpoint");
})

//auth related requests
app.use('/api/auth',authRoutes);

//user related reqs
app.use('/api/users',userRoutes);

//stocks related reqs
app.use('/api/stocks',stockRoutes);

//wallet related reqs
app.use("/api/wallet", walletRoutes);

//orders related reqs
app.use("/api/orders",orderRoutes);

//holdings related reqs
app.use("/api/holdings", holdingRoutes);

//transaction related routed
app.use("/api/transactions", transactionRoutes);

//portfolio related reqs
app.use("/api/portfolio", portfolioRoutes);

//watchlist related reqs
app.use("/api/watchlist", watchlistRoutes);

app.use("/api/market", marketRoutes);

//notification related reqs
app.use("/api/notifications", notificationRoutes);

// 5. Unknown route
app.use(notfound);

// 6. Central err Handler - Always at last
app.use(errorHandler);

//Export app
export default app;