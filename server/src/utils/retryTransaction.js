import AppError from "./AppError.js";
import ERROR_CODES from "./errorCodes.js";

const MAX_ATTEMPTS = 8;
const MAX_PAUSE_MS = 200;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// MongoDB marks an aborted transaction with the label "TransientTransactionError" when it is safe to run again
// (for example a write conflict: two transactions tried to change the same wallet at the same moment).
const isRetryable = (error) =>
    typeof error?.hasErrorLabel === "function" && error.hasErrorLabel("TransientTransactionError");

// Runs `work` (a function that opens, uses and commits its OWN transaction) again when MongoDB aborts it for a
// transient reason. Every attempt starts fresh, so it re-reads the latest data (including the current price).
// Between attempts it pauses for a random time that doubles each attempt up to a cap ("exponential backoff with full
// jitter"): the randomness stops competing requests colliding in lockstep, and the growth gives a slow database room.
export default async function retryTransaction(work) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await work();
    } catch (error) {
      if (!isRetryable(error)) throw error;

      if (attempt === MAX_ATTEMPTS) {
        throw new AppError(
          "Too many orders at the same time. Please try again.",
          409,
          ERROR_CODES.ORDER_CONFLICT
        );
      }

      await wait(Math.random() * Math.min(MAX_PAUSE_MS, 20 * 2 ** attempt));
    }
  }
}
