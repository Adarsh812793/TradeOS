import { useCallback, useEffect, useState } from "react";

// A countdown in whole seconds, for "Resend code in 0:42". It counts to a fixed END TIME instead of subtracting one each
// tick, so it stays right when the tab is in the background (browsers slow timers there) or the laptop sleeps.
//   initialSeconds  start counting as soon as the page opens (0 = wait for start())
//   start(seconds)  begins (or restarts) the countdown      secondsLeft  whole seconds remaining, 0 when it is over
export default function useCountdown(initialSeconds = 0) {
  const [endsAt, setEndsAt] = useState(() => (initialSeconds > 0 ? Date.now() + initialSeconds * 1000 : 0));
  const [now, setNow] = useState(() => Date.now());

  // While a countdown runs, look at the clock once a second (and stop when the end time is reached)
  useEffect(() => {
    if (!endsAt) return undefined;

    const timer = setInterval(() => {
      const time = Date.now();

      setNow(time);

      if (time >= endsAt) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [endsAt]);

  const start = useCallback((seconds) => {
    const time = Date.now();

    setNow(time);
    setEndsAt(time + seconds * 1000);
  }, []);

  return { secondsLeft: endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0, start };
}

// 42 -> "0:42", 65 -> "1:05"
export function formatSeconds(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
