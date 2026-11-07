
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChartNoAxesCombined } from "lucide-react";

import MarketStrip from "./MarketStrip.jsx";
import StockSearch from "./navbar/StockSearch.jsx";
import Notifications from "./navbar/Notifications.jsx";
import ProfileMenu from "./navbar/ProfileMenu.jsx";

import "./Navbar.css";

// The top bar: market indices, search, notifications and the profile menu. Only one dropdown is open at a time.
export default function Navbar() {
  // State: controls which dropdown is open
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="navbar">
      {/* On phones the rail is hidden, so the logo lives here */}
      <NavLink to="/dashboard" className="navbar__logo">
        <ChartNoAxesCombined size={20} aria-hidden="true" />
        <span className="sr-only">TradeOS home</span>
      </NavLink>

      {/* NIFTY 50 and SENSEX (hidden on narrow screens, and when there is no data) */}
      <MarketStrip />

      {/* i.Stock Search */}
      <StockSearch
        isOpen={isSearchOpen}
        onOpen={() => {
          setIsSearchOpen(true);
          setIsNotificationsOpen(false);
          setIsProfileOpen(false);
        }}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* ii.Navbar Actions */}
      <div className="navbar__actions">
        <Notifications
          isOpen={isNotificationsOpen}
          onOpen={() => {
            setIsNotificationsOpen(true);
            setIsSearchOpen(false);
            setIsProfileOpen(false);
          }}
          onClose={() => setIsNotificationsOpen(false)}
        />

        <ProfileMenu
          isOpen={isProfileOpen}
          onOpen={() => {
            setIsProfileOpen(true);
            setIsSearchOpen(false);
            setIsNotificationsOpen(false);
          }}
          onClose={() => setIsProfileOpen(false)}
        />
      </div>
    </header>
  );
}
