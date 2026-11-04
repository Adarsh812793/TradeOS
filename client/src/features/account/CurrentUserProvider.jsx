
import { useCallback, useEffect, useMemo, useState } from "react";

import CurrentUserContext from "./currentUserContext.js";
import accountApi from "./account.api.js";

// Loads the logged-in user's profile once and shares it, so the Account page and the navbar menu
// always show the same name and photo. `setUser` lets a page push an edit to everyone at once.
export default function CurrentUserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Changing this number re-runs the effect below, which reloads the profile
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    // Prevents state updates after the layout has been left
    let isMounted = true;

    async function fetchProfile() {
      try {
        setLoading(true);
        setError("");

        const response = await accountApi.getMe();

        if (isMounted) {
          setUser(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load your profile.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [retryKey]);

  // Tries the request again after a failure
  const retry = useCallback(() => {
    setRetryKey((key) => key + 1);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, loading, error, retry }),
    [user, loading, error, retry]
  );

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}
