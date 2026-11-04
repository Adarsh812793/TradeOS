// deciding whether the nested route can render.

import { Navigate, Outlet } from "react-router-dom";
import useAuth from "./useAuth.js";

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading, sessionEndReason } = useAuth();

  // Wait for session restoration before deciding.
  if (isLoading) {
    return <p>Checking your session...</p>;
  }

  // Redirect users who are not authenticated.
  if (!isAuthenticated) {
    // sessionEndReason (idle / expired) lets the login page explain why the user was signed out
    return (
      <Navigate
        to="/login"
        replace
        state={sessionEndReason ? { sessionEndReason } : undefined}
      />
    );
  }

  // Allow the matching child route to render.
  return <Outlet />;
}
