//A popup for confirmations
import { useEffect } from "react";
import { createPortal } from "react-dom";
import Button from "./Button.jsx";
import "./Modal.css";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  closeOnOverlayClick = true, //Allows clicking outside to close
  closeOnEscape = true, //Allows closing with the Escape key
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (closeOnEscape && event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (
          closeOnOverlayClick &&
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="modal__header">
          <h2 id="modal-title" className="modal__title">
            {title}
          </h2>

          <Button
            variant="secondary"
            onClick={onClose}
            className="modal__close"
            aria-label="Close dialog"
          >
            ×
          </Button>
        </header>

        <div className="modal__body">
          {children}
        </div>

        {footer && (
          <footer className="modal__footer">
            {footer}
          </footer>
        )}
      </section>
    </div>,
    document.body
  );
}
