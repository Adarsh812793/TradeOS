import { useEffect, useState } from "react";

import { getMarketStatus } from "../../market/market.api.js";
import { formatDateTime } from "../../../utils/date.utils.js";
import "./MarketChip.css";

// A small pill on the login page's brand side: is the market open right now? It is honest and a little alive: the
// prices are simulated, and the pill says so. Asked once, from the public status endpoint (the auth pages sit outside
// the app's MarketStatusProvider). If the request fails the pill simply does not appear.
// Only for screens wide enough to show it: on phones it is hidden, so no request is made at all.
export default function MarketChip() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!window.matchMedia("(min-width: 769px)").matches) return undefined;

    let isMounted = true;

    async function loadStatus() {
      try {
        const response = await getMarketStatus();

        if (isMounted) setStatus(response.data);
      } catch {
        /* no pill is better than a wrong one */
      }
    }

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!status) return null;

  return (
    <p className="market-chip">
      <span className={`market-chip__dot ${status.isOpen ? "market-chip__dot--open" : ""}`.trim()} aria-hidden="true" />
      {status.isOpen
        ? "Market open · simulated prices move every 15 seconds"
        : `Market closed${status.nextOpenAt ? ` · opens ${formatDateTime(status.nextOpenAt)}` : ""}`}
    </p>
  );
}
