// Why this exists. Checking a field when the visitor leaves it ("validate on blur") has a trap: pressing the mouse on a
// button or link blurs the field the moment the button goes DOWN, so the error message appears and pushes the button
// away before the mouse is released. The release then lands on empty space and the click is lost.
// The fix is to delay the check until the mouse button is released, so the click happens first.
// Keyboard users are not delayed: Tab-ing out of a field shows its message straight away.

let isPressed = false; // is a mouse button / finger down right now?
let waiting = []; // checks that were asked for while pressed, to run after the release

// Runs the checks that were waiting. A tick later (setTimeout 0), so the browser's own click has already been delivered.
function flush() {
  const checks = waiting;
  waiting = [];
  checks.forEach((check) => check());
}

function release() {
  isPressed = false;
  if (waiting.length > 0) setTimeout(flush, 0);
}

// The listeners are attached once, when this file is first loaded: they must already be there when the very first
// press happens. Capture phase, so nothing on the page can stop them seeing the event.
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", () => { isPressed = true; }, true);
  document.addEventListener("pointerup", release, true);
  document.addEventListener("pointercancel", release, true);
}

// Calls `check` now, or - if a mouse button or finger is down - right after it is released.
// If the release is never seen (it happened outside the window), a safety timer runs it anyway.
export default function runAfterPointerRelease(check) {
  if (!isPressed) {
    check();
    return;
  }

  waiting.push(check);
  setTimeout(flush, 1500);
}
