// A small in-memory cache for market quotes, built to protect the FYERS API and never to pass off old data as live.
//
// Rules (see createQuoteCache below):
//  1. FRESH: a value younger than `freshMs` is returned without calling FYERS.
//  2. NO STAMPEDE: if many requests arrive while a fetch is running (or right after the value expires), they ALL wait for
//     that one fetch. FYERS is called once, no matter how many users ask at the same moment.
//  3. FAILURE COOLDOWN: after a failed fetch, FYERS is not called again for `failureCooldownMs`, so an outage or an
//     expired token is not hammered by every request.
//  4. STALE IS LABELLED, NEVER LIVE: if a fetch fails but an older value exists, it is returned with `stale: true` and
//     its real `fetchedAt` time, and only while it is younger than `maxStaleMs`. Older than that, it is dropped and the
//     caller gets the error, so the screen shows "unavailable" instead of an old number.
// The cache holds one entry per key (here: one per index), so its size is bounded by the number of keys.

export const QUOTE_FRESH_MS = 30 * 1000; // how long a quote counts as live
export const QUOTE_MAX_STALE_MS = 5 * 60 * 1000; // how long an old quote may still be shown, labelled as delayed
export const QUOTE_FAILURE_COOLDOWN_MS = 5 * 1000; // pause between FYERS attempts after a failure

// Creates a cache. `now` can be replaced in tests to control time.
export function createQuoteCache({
    freshMs = QUOTE_FRESH_MS,
    maxStaleMs = QUOTE_MAX_STALE_MS,
    failureCooldownMs = QUOTE_FAILURE_COOLDOWN_MS,
    now = () => Date.now() // looked up at call time, so a replaced or mocked clock is always respected
} = {}) {
    const entries = new Map(); // key -> { value, fetchedAt, inFlight, lastFailure }

    // Returns the old value (labelled stale) if it is still young enough, otherwise throws the error.
    const staleOrThrow = (entry, error) => {
        if (entry.value !== undefined && now() - entry.fetchedAt <= maxStaleMs) {
            return { value: entry.value, fetchedAt: entry.fetchedAt, stale: true };
        }

        throw error;
    };

    // Gets the value for `key`, calling `fetcher` (an async function that asks FYERS) only when needed.
    // Resolves to { value, fetchedAt (ms), stale (boolean) }, or rejects with the FYERS error.
    const get = async (key, fetcher) => {
        let entry = entries.get(key);

        if (!entry) {
            entry = { value: undefined, fetchedAt: 0, inFlight: null, lastFailure: null };
            entries.set(key, entry);
        }

        // 1. Fresh enough: no FYERS call
        if (entry.value !== undefined && now() - entry.fetchedAt < freshMs) {
            return { value: entry.value, fetchedAt: entry.fetchedAt, stale: false };
        }

        // 2. A fetch is already running: wait for the same one instead of starting another
        if (entry.inFlight) {
            return entry.inFlight;
        }

        // 3. Failed a moment ago: do not call FYERS again yet
        if (entry.lastFailure && now() - entry.lastFailure.at < failureCooldownMs) {
            return staleOrThrow(entry, entry.lastFailure.error);
        }

        // 4. Start ONE fetch; every request that arrives meanwhile shares it (step 2)
        entry.inFlight = (async () => {
            try {
                const value = await fetcher();

                entry.value = value;
                entry.fetchedAt = now();
                entry.lastFailure = null;

                return { value, fetchedAt: entry.fetchedAt, stale: false };
            } catch (error) {
                entry.lastFailure = { at: now(), error };

                return staleOrThrow(entry, error);
            } finally {
                entry.inFlight = null; // always cleared, so a failure can never leave the entry stuck
            }
        })();

        return entry.inFlight;
    };

    // Empties the cache (used by tests).
    const clear = () => entries.clear();

    return { get, clear };
}
