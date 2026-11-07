import { describe, it, expect } from "vitest";

import retryTransaction from "../src/utils/retryTransaction.js";
import AppError from "../src/utils/AppError.js";

// An error shaped like the ones MongoDB raises for an aborted transaction
const transientError = () => {
    const error = new Error("Write conflict");
    error.hasErrorLabel = (label) => label === "TransientTransactionError";
    return error;
};

describe("retryTransaction", () => {

    it("returns the result without retrying when the first attempt works", async () => {
        let calls = 0;
        const result = await retryTransaction(async () => { calls++; return "done"; });

        expect(result).toBe("done");
        expect(calls).toBe(1);
    });

    it("runs the work again after a transient error", async () => {
        let calls = 0;
        const result = await retryTransaction(async () => {
            calls++;
            if (calls < 3) throw transientError();
            return "done";
        });

        expect(result).toBe("done");
        expect(calls).toBe(3);
    });

    it("does not retry an ordinary error (for example insufficient balance)", async () => {
        let calls = 0;
        const failure = new AppError("Insufficient wallet balance", 400, "INSUFFICIENT_BALANCE");

        await expect(retryTransaction(async () => { calls++; throw failure; })).rejects.toBe(failure);
        expect(calls).toBe(1);
    });

    it("gives up after 8 attempts with a clean 409, never an endless loop", async () => {
        let calls = 0;

        await expect(retryTransaction(async () => { calls++; throw transientError(); }))
            .rejects.toMatchObject({ statusCode: 409, errorCode: "ORDER_CONFLICT" });
        expect(calls).toBe(8);
    });
});
