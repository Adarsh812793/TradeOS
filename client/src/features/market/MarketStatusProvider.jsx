import { useCallback, useEffect, useMemo, useState } from "react";

import MarketStatusContext from "./marketStatusContext.js";
import { getMarketStatus } from "./market.api.js";
import useVisiblePolling from "../../hooks/useVisiblePolling.js";

// The market opens and closes only a few times a day, so once a minute is plenty
const STATUS_REFRESH_MS = 60_000;

// Loads the market status once and keeps it fresh, for the whole app: every component that needs it reads the same
// copy (useMarketStatus), so one request a minute serves the badge, the order form and anything added later.
// `status` is null until the first answer, and stays at the last good answer if a refresh fails: the server
// decides again on every order anyway, so a slightly old status can only make the screen less informed, not unsafe.
export default function MarketStatusProvider({ children }) {
  const [status, setStatus] = useState(null);

  // Asks the server and stores the answer; a failure keeps what is already known
  const refresh = useCallback(async () => {
    try {
      const response = await getMarketStatus();
      setStatus(response.data);
    } catch {
      /* keep the last known status */
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadFirstStatus() {
      try {
        const response = await getMarketStatus();

        if (isMounted) setStatus(response.data);
      } catch {
        /* the badge simply stays hidden until a later poll works */
      }
    }

    loadFirstStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  useVisiblePolling(refresh, STATUS_REFRESH_MS);

  const value = useMemo(() => ({ status, refresh }), [status, refresh]);

  return <MarketStatusContext.Provider value={value}>{children}</MarketStatusContext.Provider>;
}
