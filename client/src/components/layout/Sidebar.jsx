
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ChartCandlestick,
  BriefcaseBusiness,
  ClipboardList,
  Eye,
  ReceiptText,
  ChartNoAxesCombined,
} from "lucide-react";

import "./Sidebar.css";

const navigationItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Stocks", path: "/stocks", icon: ChartCandlestick },
  { label: "Portfolio", path: "/portfolio", icon: BriefcaseBusiness },
  { label: "Orders", path: "/orders", icon: ClipboardList },
  { label: "Watchlist", path: "/watchlist", icon: Eye },
  { label: "Transactions", path: "/transactions", icon: ReceiptText },
];

export default function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
  isMobileDrawerOpen = false,
  onNavigate,
}) {
  return (
    <aside
      id="tradeos-sidebar"
      className={`sidebar ${
        isCollapsed ? "sidebar--collapsed" : ""
      } ${isMobileDrawerOpen ? "sidebar--mobile-open" : ""}`}
      aria-label="Sidebar navigation"
      aria-hidden={
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 767px)").matches
          ? !isMobileDrawerOpen
          : undefined
      }
    >
      {/* Branding */}
      <div className="sidebar__brand">
        <div className="sidebar__brand-icon">
          <ChartNoAxesCombined size={24} />
        </div>

        {!isCollapsed && (
          <div className="sidebar__brand-text">
            <span className="sidebar__brand-name">TradeOS</span>
            <span className="sidebar__brand-subtitle">
              Paper Trading Platform
            </span>
          </div>
        )}
      </div>

      {/* Desktop collapse control */}
      <button
        type="button"
        className="sidebar__toggle"
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? "→" : "←"}
      </button>

      {/* Main navigation */}
      <nav className="sidebar__navigation" aria-label="Main navigation">
        {navigationItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/dashboard"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
            }
            title={isCollapsed ? label : undefined}
          >
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />

            {!isCollapsed && (
              <span className="sidebar__link-label">{label}</span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
