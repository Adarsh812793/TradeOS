
import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";

import Avatar from "../../../../components/ui/Avatar.jsx";
import AvatarCropDialog from "./AvatarCropDialog.jsx";
import AvatarPreviewDialog from "./AvatarPreviewDialog.jsx";

import accountApi from "../../account.api.js";
import {
  AVATAR_ACCEPT,
  validateAvatarFile,
  validateCroppedAvatar,
} from "../../utils/avatar.utils.js";

import "./AvatarUploader.css";

// The profile picture. Click it for a quick full-size view; the camera button chooses a new photo and a
// "Remove photo" link deletes it. A chosen photo is checked, then opened in a crop dialog; the cropped
// square is uploaded while the new picture is already shown. The result ("uploading", "updated", or what
// went wrong) goes out through `onStatus({ type, text })` (or `onStatus(null)` to clear the message).
export default function AvatarUploader({ user, onUserUpdated, onStatus }) {
  const inputRef = useRef(null);
  const cameraRef = useRef(null);
  const viewRef = useRef(null);

  // Which control gets keyboard focus back once a popup is gone: "camera" or "view" (or null)
  const focusAfterClose = useRef(null);

  const [cropSource, setCropSource] = useState(null); // { url } of the photo being cropped
  const [previewUrl, setPreviewUrl] = useState(null); // the cropped photo while it uploads
  const [isViewing, setIsViewing] = useState(false); // quick-view popup open
  const [busy, setBusy] = useState(false);

  const hasPhoto = Boolean(user.avatar?.url);

  // Free the temporary browser links when they are replaced or the component goes away
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (cropSource) URL.revokeObjectURL(cropSource.url);
    };
  }, [cropSource]);

  // Once the popups are gone and nothing is uploading, give keyboard focus back to the control that opened them
  useEffect(() => {
    if (!cropSource && !isViewing && !busy && focusAfterClose.current) {
      const target = focusAfterClose.current === "view" ? viewRef : cameraRef;

      focusAfterClose.current = null;
      target.current?.focus();
    }
  }, [cropSource, isViewing, busy]);

  // Opens the computer's file chooser
  function openFilePicker() {
    inputRef.current?.click();
  }

  // Closes the quick view
  function closeQuickView() {
    focusAfterClose.current = "view";
    setIsViewing(false);
  }

  // "Change photo" inside the quick view: close it and open the file chooser
  function changePhotoFromQuickView() {
    focusAfterClose.current = "camera";
    setIsViewing(false);
    openFilePicker();
  }

  // A photo was chosen: check it, then open the crop dialog
  function handleFileChange(event) {
    const file = event.target.files?.[0];

    // Clearing the input lets the same file be chosen again later
    event.target.value = "";

    if (!file) return;

    const problem = validateAvatarFile(file);

    if (problem) {
      onStatus({ type: "error", text: problem });
      return;
    }

    onStatus(null);
    setCropSource({ url: URL.createObjectURL(file) });
  }

  // The crop dialog was closed without choosing
  function handleCropCancel() {
    focusAfterClose.current = "camera";
    setCropSource(null);
  }

  // "Use photo" was pressed: close the dialog and upload the cropped square
  async function handleCropConfirm(croppedFile) {
    focusAfterClose.current = "camera";
    setCropSource(null);

    const problem = validateCroppedAvatar(croppedFile);

    if (problem) {
      onStatus({ type: "error", text: problem });
      return;
    }

    await uploadPhoto(croppedFile);
  }

  // Sends the cropped photo to the server and reports the outcome
  async function uploadPhoto(file) {
    setPreviewUrl(URL.createObjectURL(file));
    setBusy(true);
    onStatus({ type: "info", text: "Uploading your photo..." });

    try {
      const response = await accountApi.uploadAvatar(file);

      onUserUpdated(response.data);
      onStatus({ type: "success", text: "Profile photo updated." });
    } catch (err) {
      onStatus({
        type: "error",
        text: err.message || "Could not upload your photo. Please try again.",
      });
    } finally {
      setPreviewUrl(null);
      setBusy(false);
    }
  }

  // Deletes the current photo
  async function handleRemove() {
    setBusy(true);
    onStatus({ type: "info", text: "Removing your photo..." });

    try {
      const response = await accountApi.removeAvatar();

      onUserUpdated(response.data);
      onStatus({ type: "success", text: "Profile photo removed." });
    } catch (err) {
      onStatus({
        type: "error",
        text: err.message || "Could not remove your photo. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  const picture = (
    <Avatar
      src={previewUrl || user.avatar?.url}
      name={user.name}
      size={72}
      alt="Your profile photo"
    />
  );

  return (
    <div className="avatar-uploader">
      <div className="avatar-uploader__picture">
        {/* Only a saved photo can be opened; the plain initial is not clickable */}
        {hasPhoto ? (
          <button
            ref={viewRef}
            type="button"
            className="avatar-uploader__view"
            onClick={() => setIsViewing(true)}
            disabled={busy}
            aria-label="View profile photo"
            title="View photo"
          >
            {picture}
          </button>
        ) : (
          picture
        )}

        {busy && <span className="avatar-uploader__spinner" aria-hidden="true" />}

        <button
          ref={cameraRef}
          type="button"
          className="avatar-uploader__camera"
          onClick={openFilePicker}
          disabled={busy}
          aria-label={hasPhoto ? "Change profile photo" : "Upload profile photo"}
        >
          <Camera size={14} aria-hidden="true" />
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        onChange={handleFileChange}
        hidden
      />

      {hasPhoto && (
        <button
          type="button"
          className="avatar-uploader__remove"
          onClick={handleRemove}
          disabled={busy}
        >
          Remove photo
        </button>
      )}

      {cropSource && (
        <AvatarCropDialog
          imageUrl={cropSource.url}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}

      {isViewing && hasPhoto && (
        <AvatarPreviewDialog
          imageUrl={user.avatar.url}
          name={user.name}
          onClose={closeQuickView}
          onChangePhoto={changePhotoFromQuickView}
        />
      )}
    </div>
  );
}
