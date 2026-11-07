import { createContext } from "react";

// Holds the market status for every page inside the app layout (see MarketStatusProvider)
const MarketStatusContext = createContext(null);

export default MarketStatusContext;
