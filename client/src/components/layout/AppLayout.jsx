
import { Outlet, ScrollRestoration, useNavigation } from "react-router-dom";

import NavRail from "./NavRail.jsx";
import Navbar from "./Navbar.jsx";
import BottomNav from "./BottomNav.jsx";

import "./AppLayout.css";

// The frame around every logged-in page: icon rail (desktop and tablet), top bar, the page itself, and the bottom bar
// on phones. Exactly one <main> lives here; pages must not add their own.
export default function AppLayout() {
  // "loading" while the next page's code is downloading (the current page stays on screen meanwhile)
  const navigation = useNavigation();

  // "Skip to content" moves keyboard focus straight to the page, past the navigation
  function skipToContent(event) {
    event.preventDefault();
    document.getElementById("main-content")?.focus();
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="app-shell__skip" onClick={skipToContent}>
        Skip to content
      </a>

      {/* A thin bar across the top while the next page downloads; it only appears if that takes more than a moment */}
      {navigation.state === "loading" && (
        <div
          className="app-shell__progress"
          role="progressbar"
          aria-label="Loading page"
        />
      )}

      <NavRail />
      <Navbar />

      <main id="main-content" className="app-shell__main" tabIndex={-1}>
        <Outlet />
      </main>

      <BottomNav />

      {/* A new page opens at the top */}
      <ScrollRestoration />
    </div>
  );
}
