import { useEffect } from "react";

// Puts the cursor in a form's first field when the page opens, so a visitor can start typing straight away.
// Only on devices with a mouse: on a phone or tablet, focusing a field pops the on-screen keyboard open over the page
// before the visitor has even seen it. `setFocus` is react-hook-form's, `fieldName` the field's name ("email").
export default function useAutoFocusField(setFocus, fieldName) {
  useEffect(() => {
    const hasMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (hasMouse) setFocus(fieldName);
  }, [setFocus, fieldName]);
}
