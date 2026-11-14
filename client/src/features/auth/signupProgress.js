// Remembers, in this browser tab only, that a sign-up is waiting for its email code, so the page can come back to the
// code step after a reload. Phones often discard the page while the person is in the email app, and without this they
// would return to an empty form even though a valid code is on its way.
//
// Only the EMAIL is kept (never the password or the name), and only until the sign-up itself would expire on the server
// (30 minutes). sessionStorage is wiped when the tab closes. Storage can be blocked (private modes), so every use is
// guarded and the page works without it.
const KEY = "tradeos-signup-progress";
const MAX_AGE_MS = 30 * 60 * 1000; // the same 30 minutes the server keeps a pending sign-up

// Saves that a code was sent to this email just now
export function saveSignupProgress(email) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ email, savedAt: Date.now() }));
  } catch {
    /* the code step simply will not survive a reload */
  }
}

// The email a sign-up is waiting on, or null (nothing saved, too old, or storage unavailable)
export function readSignupProgress() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY));

    if (saved?.email && Date.now() - saved.savedAt < MAX_AGE_MS) return saved.email;
  } catch {
    /* nothing usable */
  }

  return null;
}

// Forgets it (the sign-up finished, was abandoned or has expired)
export function clearSignupProgress() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
