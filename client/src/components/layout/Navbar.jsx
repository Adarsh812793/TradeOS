
import { useState } from "react";

import StockSearch from "./navbar/StockSearch.jsx";
import Notifications from "./navbar/Notifications.jsx";
import ProfileMenu from "./navbar/ProfileMenu.jsx";
import { Menu } from "lucide-react";

import "./Navbar.css";

export default function Navbar({onMenuClick}) {
  // State: controls which dropdown is open
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="navbar">

    <button
      type="button"
      className="navbar__mobile-menu"
      onClick={onMenuClick}
      aria-label="Toggle navigation menu"
      aria-controls="tradeos-sidebar"
    >
      <Menu size={21} />
    </button>

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
