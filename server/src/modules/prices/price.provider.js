import { createSimulatedProvider } from "./simulated.provider.js";

// The one place that decides where prices come from. Today: the simulator. When a licensed data vendor is chosen,
// write a provider with the same shape ({ name, getNextPrices(stocks) }) and return it here; nothing else changes.
let provider;

export function getPriceProvider() {
  provider ??= createSimulatedProvider();
  return provider;
}
