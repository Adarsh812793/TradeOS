/* 1. Imports */
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import authApi from "./auth.api.js";
import {
  configureAuth,
  refreshSession,
  waitForPendingRefresh,
} from "../../lib/api.js";
import useIdleTimeout from "./useIdleTimeout.js";
import {
  clearLastActivity,
  hasBeenIdleTooLong,
  writeLastActivity,
} from "./idleActivity.js";

/* 2. Create Authentication Context */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // 2.1 Store the access token and authentication loading state.
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = Boolean(accessToken);

  // 2.2 Why the login ended without the user pressing "Log out": "idle" or "expired" (null otherwise).
  // ProtectedRoute passes it to the login page, which explains it to the user.
  const [sessionEndReason, setSessionEndReason] = useState(null);

  // 2.3 The newest token lives in a ref too: the API client reads it, and a ref is updated instantly
  // (state only changes after React re-renders, which could make a retried request send the old token).
  const accessTokenRef = useRef(null);

  // 2.4 True while the login is being ended, so a late token renewal cannot bring it back.
  const isEndingSessionRef = useRef(false);

  // 3. Stores a token in the ref (for the API client) and in state (for React) at the same moment.
  const applyToken = useCallback((token) => {
    accessTokenRef.current = token;
    setAccessToken(token);
  }, []);

  // 4. Ends the login because of something other than the Log out button, and remembers why.
  const endSession = useCallback(
    async (reason) => {
      if (isEndingSessionRef.current) return;
      isEndingSessionRef.current = true;

      setSessionEndReason(reason);
      applyToken(null);
      clearLastActivity();

      try {
        // Let a renewal in progress finish first, so it cannot set a fresh cookie after we clear it
        await waitForPendingRefresh();

        // Idle: the refresh token is still valid, so revoke it on the server and clear the cookie.
        // Expired: the server already rejected it, nothing to revoke.
        if (reason === "idle") {
          await authApi.logout();
        }
      } catch {
        // The login is already over on screen; a failed clean-up call changes nothing for the user
      } finally {
        isEndingSessionRef.current = false;
      }
    },
    [applyToken]
  );

  // 5. Tells the API client how to read, renew and give up on the login.
  useEffect(() => {
    configureAuth({
      getAccessToken: () => accessTokenRef.current,
      onTokenRefreshed: (token) => {
        if (!isEndingSessionRef.current) {
          applyToken(token);
        }
      },
      onSessionExpired: () => {
        endSession("expired");
      },
    });
  }, [applyToken, endSession]);

  // 6. Restore the user's session when the application starts.
  useEffect(() => {
    async function restoreSession() {
      // Too long since the last activity (even if the browser was closed meanwhile): do not restore the login
      if (hasBeenIdleTooLong()) {
        setSessionEndReason("idle");

        try {
          await authApi.logout();
        } catch {
          // best effort: the login is not restored either way
        }

        clearLastActivity();
        setIsLoading(false);
        return;
      }

      try {
        // Shares the single renewal with any other request, so the refresh token is never used twice
        await refreshSession();
      } catch {
        applyToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, [applyToken]);

  // 7. Sign the user out after 30 minutes without activity (polling does not count as activity).
  useIdleTimeout({
    enabled: isAuthenticated,
    onIdle: () => endSession("idle"),
  });

  // 8. Log in the user and store the returned access token.
  async function login(credentials) {
    const response = await authApi.login(credentials);
    const token = response.data.accessToken;

    isEndingSessionRef.current = false;
    setSessionEndReason(null);
    writeLastActivity();
    applyToken(token);

    return response.data;
  }

  // 9. Log out the user and clear the access token.
  async function logout() {
    isEndingSessionRef.current = true;

    try {
      await waitForPendingRefresh();
      await authApi.logout();
    } finally {
      applyToken(null);
      clearLastActivity();
      setSessionEndReason(null);
      isEndingSessionRef.current = false;
    }
  }

  // 10. Provide authentication state and actions to the application.
  return (
    <AuthContext.Provider
      value={{
        accessToken,
        isAuthenticated,
        isLoading,
        sessionEndReason,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* 11. Export Authentication Context */
export default AuthContext;
