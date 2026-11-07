import { Link, useRouteError } from "react-router-dom";
import { RefreshCw, TriangleAlert } from "lucide-react";

import Button from "../ui/Button.jsx";
import "./RouteError.css";

// What the browser says when a page's code file cannot be downloaded (usually because the app was updated while the tab was open)
const FAILED_DOWNLOAD =
  /dynamically imported module|importing a module script failed|loading chunk|failed to fetch/i;

// The screen shown instead of React Router's raw error page when a page crashes or its code fails to download.
// Inside the app frame it replaces only the page (navigation stays usable); `fullPage` is for errors outside the frame.
export default function RouteError({ fullPage = false }) {
  const error = useRouteError();
  const isOutdated = FAILED_DOWNLOAD.test(error?.message ?? "");

  return (
    <div
      className={`route-error ${fullPage ? "route-error--full-page" : ""}`.trim()}
      role="alert"
    >
      <div className="route-error__icon" aria-hidden="true">
        <TriangleAlert size={28} strokeWidth={1.6} />
      </div>

      <h1 className="route-error__title">
        {isOutdated ? "TradeOS was updated" : "Something went wrong"}
      </h1>

      <p className="route-error__description">
        {isOutdated
          ? "A newer version is available. Reload the page to continue."
          : "This page ran into a problem. Reloading usually fixes it, and your account and trades are safe."}
      </p>

      <div className="route-error__actions">
        <Button onClick={() => window.location.reload()}>
          <RefreshCw size={16} aria-hidden="true" />
          Reload page
        </Button>

        {/* A plain link (not a router link) so it works even if the router itself is the problem */}
        <Link className="btn btn--secondary" to="/dashboard" reloadDocument>
          Go to dashboard
        </Link>
      </div>

      {import.meta.env.DEV && error?.message && (
        <p className="route-error__details">{error.message}</p>
      )}
    </div>
  );
}
