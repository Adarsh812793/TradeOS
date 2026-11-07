import { useRef, useState } from "react";
import { NavLink, matchPath, useLocation } from "react-router-dom";
import { Ellipsis } from "lucide-react";

import useClickOutside from "./hooks/useClickOutside.js";
import { BOTTOM_ITEMS, MORE_ITEMS } from "./navigation.js";
import "./BottomNav.css";

// The phone navigation: four main pages and a "More" button that opens a small sheet with the rest.
// It is only shown on phones (the icon rail is used on larger screens).
export default function BottomNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const navRef = useRef(null);
  const { pathname } = useLocation();

  // Tap outside or press Escape closes the sheet
  useClickOutside(navRef, isMoreOpen, () => setIsMoreOpen(false));

  // "More" looks selected while the current page is one of its pages (Watchlist, Transactions, Account)
  const isMoreActive = MORE_ITEMS.some((item) =>
    matchPath({ path: item.path, end: false }, pathname)
  );

  return (
    <nav className="bottom-nav" aria-label="Main" ref={navRef}>
      <ul className="bottom-nav__list">
        {BOTTOM_ITEMS.map(({ label, path, icon: Icon }) => (
          <li key={path}>
            <NavLink
              to={path}
              className={({ isActive }) =>
                `bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`
              }
              onClick={() => setIsMoreOpen(false)}
            >
              <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
              <span className="bottom-nav__label">{label}</span>
            </NavLink>
          </li>
        ))}

        <li>
          <button
            type="button"
            className={`bottom-nav__item ${
              isMoreActive ? "bottom-nav__item--active" : ""
            } ${isMoreOpen ? "bottom-nav__item--open" : ""}`}
            onClick={() => setIsMoreOpen((open) => !open)}
            aria-expanded={isMoreOpen}
            aria-controls="bottom-nav-more"
            aria-haspopup="true"
          >
            <Ellipsis size={22} strokeWidth={1.8} aria-hidden="true" />
            <span className="bottom-nav__label">More</span>
          </button>
        </li>
      </ul>

      {isMoreOpen && (
        <ul className="bottom-nav__sheet" id="bottom-nav-more">
          {MORE_ITEMS.map(({ label, path, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `bottom-nav__sheet-link ${
                    isActive ? "bottom-nav__sheet-link--active" : ""
                  }`
                }
                onClick={() => setIsMoreOpen(false)}
              >
                <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
