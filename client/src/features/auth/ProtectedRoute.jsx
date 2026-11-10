// deciding whether the nested route can render.

import { Navigate, Outlet } from "react-router-dom";
import useAuth from "./useAuth.js";
import AppLoading from "../../components/layout/AppLoading.jsx";

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading, sessionEndReason } = useAuth();

  // Wait for session restoration before deciding.
  if (isLoading) {
    return <AppLoading />; // the app's spinner, instead of a bare line of text
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
