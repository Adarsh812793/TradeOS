
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, LogOut, Mail } from "lucide-react";

import Button from "../../../../components/ui/Button.jsx";
import useAuth from "../../../auth/useAuth.js";
import ChangePasswordForm from "./ChangePasswordForm.jsx";

import "./SecurityPanel.css";

// What the success message says about the other devices
function getChangedMessage(count) {
  if (count === 0) return "Password changed successfully.";
  if (count === 1) return "Password changed. Your other device has been signed out.";
  return `Password changed. Your ${count} other devices have been signed out.`;
}

// Body of the Security section: change password, forgot password (a link to the reset page) and log out.
export default function SecurityPanel() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [notice, setNotice] = useState(null); // { type: "success", text } or null
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Used to give keyboard focus back to the "Change password" button when the form closes
  const changeButtonRef = useRef(null);
  const shouldRestoreFocus = useRef(false);

  useEffect(() => {
    if (!isChangingPassword && shouldRestoreFocus.current) {
      shouldRestoreFocus.current = false;
      changeButtonRef.current?.focus();
    }
  }, [isChangingPassword]);

  // Opens the change-password form
  function openForm() {
    setNotice(null);
    setIsChangingPassword(true);
  }

  // Closes the form without changing anything
  function closeForm() {
    shouldRestoreFocus.current = true;
    setIsChangingPassword(false);
  }

  // Called after a successful change: closes the form and tells the user what happened
  function handleChanged({ signedOutOtherDevices }) {
    setNotice({ type: "success", text: getChangedMessage(signedOutOtherDevices) });
    closeForm();
  }

  // Logs out of this device and goes to the login page (same as the navbar menu)
  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      // The session is cleared on this device either way, so carry on to the login page
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="security-panel">
      {notice && (
        <p className="security-panel__notice" role="status">
          {notice.text}
        </p>
      )}

      <ul className="security-panel__list">
        {/* Change password */}
        <li className="security-panel__item">
          <div className="security-panel__row">
            <span className="security-panel__icon" aria-hidden="true">
              <KeyRound size={18} />
            </span>

            <div className="security-panel__text">
              <h3>Change password</h3>
              <p>Choose a strong password you don't use anywhere else.</p>
            </div>

            <Button
              variant="secondary"
              onClick={openForm}
              disabled={isChangingPassword}
              ref={changeButtonRef}
            >
              Change password
            </Button>
          </div>

          {isChangingPassword && (
            <div className="security-panel__form">
              <ChangePasswordForm onCancel={closeForm} onChanged={handleChanged} />
            </div>
          )}
        </li>

        {/* Forgot password: the emailed-code reset (it signs every device out, this one included) */}
        <li className="security-panel__item">
          <div className="security-panel__row">
            <span className="security-panel__icon" aria-hidden="true">
              <Mail size={18} />
            </span>

            <div className="security-panel__text">
              <h3>Forgot password</h3>
              <p>Reset it with a code sent to your email. This signs you out of every device.</p>
            </div>

            <Button as={Link} to="/forgot-password" variant="secondary">
              Reset password
            </Button>
          </div>
        </li>

        {/* Log out */}
        <li className="security-panel__item">
          <div className="security-panel__row">
            <span className="security-panel__icon" aria-hidden="true">
              <LogOut size={18} />
            </span>

            <div className="security-panel__text">
              <h3>Log out</h3>
              <p>Sign out of TradeOS on this device.</p>
            </div>

            <Button
              variant="secondary"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </Button>
          </div>
        </li>
      </ul>
    </div>
  );
}
