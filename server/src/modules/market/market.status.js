import config from "../../config/env.js";
import AppError from "../../utils/AppError.js";
import ERROR_CODES from "../../utils/errorCodes.js";
import { getMarketStatus } from "./market.hours.js";

// The market status right now, including the development override from config.
// market.hours.js stays pure (it only knows about time); this is where configuration meets it.
export const getCurrentMarketStatus = () =>
  getMarketStatus(new Date(), { alwaysOpen: config.MARKET_ALWAYS_OPEN });

// Throws 403 MARKET_CLOSED unless orders may be placed now. The server decides: the frontend only mirrors it.
export function assertMarketOpen() {
  if (!getCurrentMarketStatus().isOpen) {
    throw new AppError(
      "The market is closed. Orders can be placed on weekdays from 9:15 AM to 3:30 PM IST, except exchange holidays.",
      403,
      ERROR_CODES.MARKET_CLOSED
    );
  }
}
