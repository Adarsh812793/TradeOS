import { useContext } from "react";

import MarketStatusContext from "./marketStatusContext.js";

// Gives a component the market status: { status, refresh }. `status` is null until it has loaded (treat that as
// "unknown", not as closed), otherwise { isOpen, reason, holidayName, nextOpenAt, priceSource, ... }.
export default function useMarketStatus() {
  const context = useContext(MarketStatusContext);

  if (context === null) {
    throw new Error("useMarketStatus must be used within a MarketStatusProvider");
  }

  return context;
}
