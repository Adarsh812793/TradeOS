import { runPriceUpdate, PRICE_UPDATE_INTERVAL_MS } from "./price.service.js";

// The timer that keeps prices moving: calls runPriceUpdate every 15 seconds (which itself does nothing while the
// market is closed). Started from server.js only, so tests that import the app never start it.
// A run that is still busy when the next tick arrives makes that tick skip, so runs never pile up. An error is
// logged and the next tick tries again: the job never crashes the server.
export function startPriceJob({ intervalMs = PRICE_UPDATE_INTERVAL_MS, run = runPriceUpdate } = {}) {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;

    try {
      await run();
    } catch (error) {
      console.error("[prices] update failed:", error.message);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, intervalMs);
  tick(); // do not wait a whole interval after a (re)start

  return { tick, stop: () => clearInterval(timer) };
}
