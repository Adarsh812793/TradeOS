//useEffect function used to close an open dropdown

import { useEffect } from "react";

export default function useClickOutside(ref, isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event) {
      if (!ref.current?.contains(event.target)) {
        onClose();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref, isOpen, onClose]);
}