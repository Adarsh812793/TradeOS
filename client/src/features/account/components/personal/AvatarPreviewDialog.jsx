
import { useState } from "react";

import Avatar from "../../../../components/ui/Avatar.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Modal from "../../../../components/ui/Modal.jsx";

import "./AvatarPreviewDialog.css";

// Quick view of the saved profile photo at full size, plus how it looks as the small round avatar used
// in the menu. "Change photo" hands over to the parent, which closes this and opens the file chooser.
export default function AvatarPreviewDialog({
  imageUrl,
  name,
  onClose,
  onChangePhoto,
}) {
  const [loadFailed, setLoadFailed] = useState(false);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Your profile photo"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>

          <Button onClick={onChangePhoto}>Change photo</Button>
        </>
      }
    >
      {loadFailed ? (
        <p className="avatar-preview__error" role="alert">
          This photo couldn't be loaded right now. Please try again later.
        </p>
      ) : (
        <div className="avatar-preview">
          <img
            src={imageUrl}
            alt="Your profile photo"
            className="avatar-preview__image"
            onError={() => setLoadFailed(true)}
          />

          <div className="avatar-preview__small">
            <Avatar src={imageUrl} name={name} size={40} />

            <p>This is how it appears in the menu and across TradeOS.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
