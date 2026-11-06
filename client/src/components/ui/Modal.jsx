//A popup for confirmations
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "./Button.jsx";
import "./Modal.css";

// Everything a keyboard user can tab to inside the dialog
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// A dialog over the page. While it is open: focus moves into it, Tab stays inside it, Escape closes it
// (unless closeOnEscape is false) and focus returns to where it was when it closes.
// `size` is sm | md | lg; pass closeOnOverlayClick / closeOnEscape = false while a request is running.
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnOverlayClick = true, //Allows clicking outside to close
  closeOnEscape = true, //Allows closing with the Escape key
}) {
  const titleId = useId(); // each dialog gets its own id (two dialogs must never share one)
  const dialogRef = useRef(null);

  // Always the newest onClose. Callers often pass a new inline function on every render; keeping it in a ref
  // means the focus handling below runs once per open, not on every re-render.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (closeOnEscape && event.key === "Escape") {
        onCloseRef.current();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Remember what had focus so it can be given back when the dialog closes
    const previouslyFocused = document.activeElement;

    // Move focus into the dialog (unless a field inside it already took focus, e.g. via autoFocus)
    if (dialogRef.current && !dialogRef.current.contains(document.activeElement)) {
      dialogRef.current.focus();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, closeOnEscape]);

  // Keeps Tab and Shift+Tab inside the dialog instead of letting focus escape to the page behind it
  const trapFocus = (event) => {
    if (event.key !== "Tab" || !dialogRef.current) return;

    const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)];

    if (items.length === 0) {
      event.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

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
        ref={dialogRef}
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapFocus}
      >
        <header className="modal__header">
          <h2 id={titleId} className="modal__title">
            {title}
          </h2>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="modal__close"
            aria-label="Close dialog"
          >
            <X size={18} aria-hidden="true" />
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
