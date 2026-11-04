
import { useEffect, useRef, useState } from "react";

import ProfileOverview from "./ProfileOverview.jsx";
import ProfileEditForm from "./ProfileEditForm.jsx";

import "./PersonalInformation.css";

// Body of the Personal Information section: shows the profile, or the edit form after "Edit Profile".
// `onUserUpdated` receives the saved user so the whole app shows the new name / photo straight away.
// A message line above the profile reports what just happened (saved, uploading a photo, an error...).
export default function PersonalInformation({ user, onUserUpdated }) {
  const [isEditing, setIsEditing] = useState(false);

  // { type: "success" | "error" | "info", text } or null
  const [notice, setNotice] = useState(null);

  // Used to give keyboard focus back to the Edit button when the form closes
  const editButtonRef = useRef(null);
  const shouldRestoreFocus = useRef(false);

  useEffect(() => {
    if (!isEditing && shouldRestoreFocus.current) {
      shouldRestoreFocus.current = false;
      editButtonRef.current?.focus();
    }
  }, [isEditing]);

  // Opens the edit form
  function startEditing() {
    setNotice(null);
    setIsEditing(true);
  }

  // Closes the edit form without saving
  function stopEditing() {
    shouldRestoreFocus.current = true;
    setIsEditing(false);
  }

  // Called after a successful save: updates the app and closes the form
  function handleSaved(updatedUser) {
    onUserUpdated(updatedUser);
    setNotice({ type: "success", text: "Profile updated successfully." });
    stopEditing();
  }

  if (isEditing) {
    return (
      <ProfileEditForm
        user={user}
        onCancel={stopEditing}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <>
      {notice && (
        <p
          className={`personal-information__notice personal-information__notice--${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
        >
          {notice.text}
        </p>
      )}

      <ProfileOverview
        user={user}
        onEdit={startEditing}
        editButtonRef={editButtonRef}
        onUserUpdated={onUserUpdated}
        onStatus={setNotice}
      />
    </>
  );
}
