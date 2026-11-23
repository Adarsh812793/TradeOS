// Remembers, in this browser tab only, that a flow is waiting for an emailed code, so the page can come back to its code
// step after a reload. Phones often discard the page while the person is in the email app, and without this they would
// return to an empty form even though a valid code is on its way.
//
// Only the EMAIL is kept (never a password or a name), and only until the server would forget the request (30 minutes).
// sessionStorage is wiped when the tab closes. Storage can be blocked (private modes), so every use is guarded and the
// page works without it. Each flow (sign-up, forgot password) makes its own store with its own key.
const MAX_AGE_MS = 30 * 60 * 1000; // the same 30 minutes the server keeps a pending request

// Makes the three functions for one flow, kept under `key`
export function createEmailProgress(key) {
  return {
    // Saves that a code was sent to this email just now
    save(email) {
      try {
        sessionStorage.setItem(key, JSON.stringify({ email, savedAt: Date.now() }));
      } catch {
        /* the code step simply will not survive a reload */
      }
    },

    // The email a request is waiting on, or null (nothing saved, too old, or storage unavailable)
    read() {
      try {
        const saved = JSON.parse(sessionStorage.getItem(key));

        if (saved?.email && Date.now() - saved.savedAt < MAX_AGE_MS) return saved.email;
      } catch {
        /* nothing usable */
      }

      return null;
    },

    // Forgets it (the flow finished, was abandoned or has expired)
    clear() {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* nothing to clear */
      }
    },
  };
}
