
import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar.jsx";
import Navbar from "./Navbar.jsx";

import "./AppLayout.css";

export default function AppLayout() {

  //i.State variables
  // Desktop sidebar preference
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("tradeos-sidebar-collapsed") === "true";
  });

  // Mobile drawer visibility
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  //ii. Functions
  function handleToggleCollapse() {
    setIsCollapsed((previousState) => {
      const nextState = !previousState;

      localStorage.setItem(
        "tradeos-sidebar-collapsed",
        String(nextState)
      );

      return nextState;
    });
  }

  function handleCloseMobileDrawer() {
    setIsMobileDrawerOpen(false);
  }

  return (
    <div
      className={`app-layout ${
        isCollapsed ? "app-layout--collapsed" : ""
      } ${isMobileDrawerOpen ? "app-layout--mobile-open" : ""}`}
    >
      {/* Sidebar navigation */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileDrawerOpen={isMobileDrawerOpen}
        onNavigate={handleCloseMobileDrawer}
      />

      {/* Mobile backdrop */}
      {isMobileDrawerOpen && (
        <button
          type="button"
          className="app-layout__backdrop"
          aria-label="Close navigation menu"
          onClick={handleCloseMobileDrawer}
        />
      )}

      {/* Main content */}
      <main className="app-layout__content">
        <Navbar
          onMenuClick={() =>
            setIsMobileDrawerOpen((previousState) => !previousState)
          }
        />

        <div className="app-layout__page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
