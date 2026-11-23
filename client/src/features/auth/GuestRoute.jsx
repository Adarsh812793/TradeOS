import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "./useAuth.js";

// The mirror image of ProtectedRoute: wraps the pages made for visitors (landing, login, signup).
// A user who is already logged in has no business there, so they are sent straight to the dashboard.
//
// While the session is still being restored (isLoading) it renders the page anyway instead of waiting:
// most visitors are logged out, and making every one of them stare at a spinner for a network round trip
// would delay the landing page's first paint. The price is that a logged-in user may see the page for a
// moment before being redirected.
export default function GuestRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // One exception: "Delete account" and a finished password reset navigate to /login while the user is still logged in
  // (and log out right after) so that their message ("your account was deleted", "password reset") survives. Without
  // this line the guard would bounce that navigation to the dashboard and the message would be lost.
  const isLeavingWithMessage = Boolean(location.state?.accountDeleted || location.state?.passwordReset);

  if (isAuthenticated && !isLeavingWithMessage) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
