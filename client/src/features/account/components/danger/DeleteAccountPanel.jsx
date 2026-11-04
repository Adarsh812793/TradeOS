
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

import Button from "../../../../components/ui/Button.jsx";
import useAuth from "../../../auth/useAuth.js";
import DeleteAccountDialog from "./DeleteAccountDialog.jsx";

import "./DeleteAccountPanel.css";

// Body of the Danger Zone section: explains what deleting does and opens the confirmation popup.
export default function DeleteAccountPanel() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Used to give keyboard focus back to the Delete button if the popup is cancelled
  const deleteButtonRef = useRef(null);
  const shouldRestoreFocus = useRef(false);

  useEffect(() => {
    if (!isDialogOpen && shouldRestoreFocus.current) {
      shouldRestoreFocus.current = false;
      deleteButtonRef.current?.focus();
    }
  }, [isDialogOpen]);

  // Closes the popup without deleting anything
  function closeDialog() {
    shouldRestoreFocus.current = true;
    setIsDialogOpen(false);
  }

  // The server has deleted the account (and removed the login cookie). Go to the login page, which shows
  // a "your account has been deleted" message, and clear this tab's leftover login.
  // The ORDER matters: logging out first would make ProtectedRoute redirect to /login by itself, without the
  // message, and that automatic redirect would override ours. So leave the protected pages first
  // (flushSync + await = the login page is really on screen) and only then clear the login.
  async function handleDeleted() {
    await navigate("/login", {
      replace: true,
      flushSync: true,
      state: { accountDeleted: true },
    });

    try {
      await logout();
    } catch {
      // Nothing left to sign out of on the server, carry on
    }
  }

  return (
    <div className="delete-panel">
      <div className="delete-panel__text">
        <h3>Delete account</h3>
        <p>
          Permanently delete your account and everything in it: your profile and
          photo, virtual wallet, holdings, orders, transactions and watchlist.
          This cannot be undone.
        </p>
      </div>

      <Button
        variant="danger"
        onClick={() => setIsDialogOpen(true)}
        ref={deleteButtonRef}
      >
        <Trash2 size={16} aria-hidden="true" />
        Delete account
      </Button>

      {isDialogOpen && (
        <DeleteAccountDialog onClose={closeDialog} onDeleted={handleDeleted} />
      )}
    </div>
  );
}
