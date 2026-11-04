
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserRound,
  ChevronDown,
  UserCircle,
  LogOut,
} from "lucide-react";

import useAuth from "../../../features/auth/useAuth.js";
import useCurrentUser from "../../../features/account/useCurrentUser.js";
import Avatar from "../../ui/Avatar.jsx";
import useClickOutside from "../hooks/useClickOutside.js";
import "./ProfileMenu.css";

// Navbar profile button and its dropdown (name, photo, Account, Log out).
// Name and photo come from the shared current-user profile, so they update as soon as they are edited.
export default function ProfileMenu({ isOpen, onOpen, onClose }) {
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { user } = useCurrentUser();

  // Close the menu when clicking outside or pressing Escape.
  useClickOutside(profileRef, isOpen, onClose);

  // Navigate to the account page.
  function handleAccountClick() {
    onClose();
    navigate("/account");
  }

  // Log out using the existing authentication context.
  async function handleLogout() {
    onClose();

    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="profile-menu" ref={profileRef}>
      {/* Profile button */}
      <button
        type="button"
        className={`navbar__action-button profile-menu__trigger ${
          isOpen ? "navbar__action-button--active" : ""
        }`}
        onClick={isOpen ? onClose : onOpen}
        aria-label="Open profile menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {user?.avatar?.url ? (
          <Avatar src={user.avatar.url} name={user.name} size={26} />
        ) : (
          <UserRound size={19} strokeWidth={1.8} />
        )}
        <ChevronDown
          className={`profile-menu__chevron ${
            isOpen ? "profile-menu__chevron--open" : ""
          }`}
          size={14}
        />
      </button>

      {/* Profile dropdown */}
      {isOpen && (
        <div className="profile-menu__dropdown" role="menu">
          <div className="profile-menu__user">
            <Avatar src={user?.avatar?.url} name={user?.name} size={40} />

            <div className="profile-menu__user-info">
              <p className="profile-menu__user-name">
                {user?.name || "Your account"}
              </p>
              <p className="profile-menu__user-label">
                Virtual Trading Account
              </p>
            </div>
          </div>

          <div className="profile-menu__divider" />

          <button
            type="button"
            className="profile-menu__item"
            role="menuitem"
            onClick={handleAccountClick}
          >
            <UserCircle size={17} />
            <span>Account</span>
          </button>

          <button
            type="button"
            className="profile-menu__item profile-menu__item--danger"
            role="menuitem"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}
