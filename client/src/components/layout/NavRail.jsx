import { NavLink } from "react-router-dom";
import { ChartNoAxesCombined } from "lucide-react";

import { ACCOUNT, RAIL_ITEMS } from "./navigation.js";
import "./NavRail.css";

// One icon link in the rail. The name shows as a tooltip on hover and keyboard focus, and is read out by screen readers.
function RailLink({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `nav-rail__link ${isActive ? "nav-rail__link--active" : ""}`
      }
    >
      <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
      <span className="sr-only">{item.label}</span>
      <span className="nav-rail__tooltip" aria-hidden="true">
        {item.label}
      </span>
    </NavLink>
  );
}

// The slim icon navigation on the left (desktop and tablet). Phones use the bottom bar instead (BottomNav).
export default function NavRail() {
  return (
    <nav className="nav-rail" aria-label="Main">
      <NavLink to="/dashboard" className="nav-rail__logo">
        <ChartNoAxesCombined size={22} aria-hidden="true" />
        <span className="sr-only">TradeOS home</span>
      </NavLink>

      <ul className="nav-rail__list">
        {RAIL_ITEMS.map((item) => (
          <li key={item.path}>
            <RailLink item={item} />
          </li>
        ))}
      </ul>

      <div className="nav-rail__account">
        <RailLink item={ACCOUNT} />
      </div>
    </nav>
  );
}
