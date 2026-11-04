// Helpers for the idle timeout: when did the user last DO something?
// The time is saved in localStorage so that every open tab shares it, and so that reopening the app after a
// long absence is still noticed. Every access is wrapped in try/catch because storage can be blocked.

// The user is signed out after this long without any activity
export const IDLE_LIMIT_MS = 30 * 60 * 1000;
export const IDLE_LIMIT_MINUTES = IDLE_LIMIT_MS / 60000;

const STORAGE_KEY = "tradeos-last-activity";

// Reads the saved time of the last activity (a timestamp in milliseconds), or null if there is none.
export function readLastActivity() {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));

    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

// Saves the time of the last activity.
export function writeLastActivity(timestamp = Date.now()) {
  try {
    localStorage.setItem(STORAGE_KEY, String(timestamp));
  } catch {
    // Storage is blocked: the in-memory time inside useIdleTimeout still works for this tab
  }
}

// Forgets the last activity (called when the login ends).
export function clearLastActivity() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to clear
  }
}

// True if the saved last activity is older than the idle limit (used when the app is opened again).
export function hasBeenIdleTooLong() {
  const lastActivity = readLastActivity();

  return lastActivity !== null && Date.now() - lastActivity > IDLE_LIMIT_MS;
}
