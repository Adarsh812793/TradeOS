
import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

import Button from "../../../../components/ui/Button.jsx";
import Modal from "../../../../components/ui/Modal.jsx";

import {
  MAX_ZOOM,
  MIN_ZOOM,
  createInitialView,
  getCropRect,
  getDisplayedSize,
  moveView,
  renderCroppedAvatar,
  zoomView,
} from "../../utils/avatarCrop.utils.js";

import "./AvatarCropDialog.css";

const KEY_MOVE_STEP = 10; // pixels moved per arrow key press
const KEY_ZOOM_STEP = 0.2;

// Popup shown after a photo is chosen: drag the photo to reposition it, zoom with the slider, mouse wheel or
// + / - keys (arrow keys move it), then "Use photo" hands a cropped square JPEG File to `onConfirm`.
// `imageUrl` is a temporary browser link to the chosen photo (owned and cleaned up by the parent).
export default function AvatarCropDialog({ imageUrl, onCancel, onConfirm }) {
  const imageRef = useRef(null);
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const naturalRef = useRef(null); // the wheel listener below needs the latest size without re-attaching

  const [natural, setNatural] = useState(null); // the photo's own size in pixels
  const [view, setView] = useState(null); // zoom and position, see avatarCrop.utils.js
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Put keyboard focus on the crop area as soon as the dialog opens
  useEffect(() => {
    viewportRef.current?.focus();
  }, []);

  // Mouse wheel zooms. Attached by hand because React's own wheel handler cannot stop the page from scrolling.
  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) return undefined;

    function handleWheel(event) {
      event.preventDefault();

      const size = naturalRef.current;

      if (!size) return;

      setView((current) =>
        current ? zoomView(current, current.zoom - event.deltaY * 0.002, size) : current
      );
    }

    viewport.addEventListener("wheel", handleWheel, { passive: false });

    return () => viewport.removeEventListener("wheel", handleWheel);
  }, []);

  // The photo finished loading: remember its size and start centred at zoom 1
  function handleImageLoad(event) {
    const { naturalWidth, naturalHeight } = event.currentTarget;

    if (!naturalWidth || !naturalHeight) {
      setLoadFailed(true);
      return;
    }

    const size = { width: naturalWidth, height: naturalHeight };

    naturalRef.current = size;
    setNatural(size);
    setView(createInitialView(size));
  }

  // Start dragging the photo
  function handlePointerDown(event) {
    if (!view || (event.pointerType === "mouse" && event.button !== 0)) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startView: view,
    };
  }

  // Move the photo with the pointer
  function handlePointerMove(event) {
    const drag = dragRef.current;

    if (!drag) return;

    setView(
      moveView(
        drag.startView,
        event.clientX - drag.startX,
        event.clientY - drag.startY,
        natural
      )
    );
  }

  // Stop dragging
  function handlePointerEnd() {
    dragRef.current = null;
  }

  // Arrow keys move the photo, + and - zoom
  function handleKeyDown(event) {
    if (!view) return;

    const moves = {
      ArrowLeft: [-KEY_MOVE_STEP, 0],
      ArrowRight: [KEY_MOVE_STEP, 0],
      ArrowUp: [0, -KEY_MOVE_STEP],
      ArrowDown: [0, KEY_MOVE_STEP],
    };

    if (moves[event.key]) {
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      setView(moveView(view, dx, dy, natural));
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setView(zoomView(view, view.zoom + KEY_ZOOM_STEP, natural));
    } else if (event.key === "-") {
      event.preventDefault();
      setView(zoomView(view, view.zoom - KEY_ZOOM_STEP, natural));
    }
  }

  // The zoom slider moved
  function handleZoomChange(event) {
    setView(zoomView(view, Number(event.target.value), natural));
  }

  // Cut out the chosen square and hand it to the parent
  async function handleConfirm() {
    setSaving(true);
    setError("");

    try {
      const croppedFile = await renderCroppedAvatar(
        imageRef.current,
        getCropRect(view, natural)
      );

      onConfirm(croppedFile);
    } catch (err) {
      setError(err.message || "Could not crop this photo. Please try another image.");
      setSaving(false);
    }
  }

  const shown = natural && view ? getDisplayedSize(view.zoom, natural) : null;

  // How far along the zoom slider is (0-100), used to colour the filled part of the track
  const zoomPercent = (((view?.zoom ?? MIN_ZOOM) - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100;

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="Crop your photo"
      closeOnOverlayClick={false}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>

          <Button
            onClick={handleConfirm}
            disabled={!view || loadFailed || saving}
          >
            {saving ? "Preparing..." : "Use photo"}
          </Button>
        </>
      }
    >
      {loadFailed ? (
        <p className="avatar-crop__error" role="alert">
          We couldn't open this image. Please close this and choose a different photo.
        </p>
      ) : (
        <div className="avatar-crop">
          <p className="avatar-crop__hint">
            Drag the photo to reposition it. Use the slider to zoom.
          </p>

          <div
            ref={viewportRef}
            className="avatar-crop__viewport"
            tabIndex={0}
            role="group"
            aria-label="Crop area. Drag to move the photo, use the arrow keys to move it and plus or minus to zoom."
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onKeyDown={handleKeyDown}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt=""
              draggable={false}
              className="avatar-crop__image"
              style={
                shown
                  ? {
                      width: shown.width,
                      height: shown.height,
                      transform: `translate(${view.offsetX}px, ${view.offsetY}px)`,
                    }
                  : { visibility: "hidden" }
              }
              onLoad={handleImageLoad}
              onError={() => setLoadFailed(true)}
            />

            {/* Round guide: the profile photo is shown as a circle */}
            <span className="avatar-crop__mask" aria-hidden="true" />
          </div>

          <div className="avatar-crop__zoom">
            <ZoomOut size={18} aria-hidden="true" />

            <input
              type="range"
              className="avatar-crop__slider"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step="0.01"
              value={view?.zoom ?? MIN_ZOOM}
              style={{ "--zoom-fill": `${zoomPercent}%` }}
              onChange={handleZoomChange}
              disabled={!view || saving}
              aria-label="Zoom"
            />

            <ZoomIn size={18} aria-hidden="true" />
          </div>

          {error && (
            <p className="avatar-crop__error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
