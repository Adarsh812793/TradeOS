import { useEffect } from "react";
import { Link } from "react-router-dom";

import useAuth from "../features/auth/useAuth.js";
import Button from "../components/ui/Button.jsx";

import "./NotFoundPage.css";

// The candlesticks drifting along the bottom: horizontal position, height, where the body starts and how tall it is
// (all in %), whether the candle is "up" (green) or "down" (red), and the rhythm of its sway. Decorative only.
const CANDLES = [
  { x: 4, h: 120, top: 30, body: 45, up: true, delay: 0, dur: 6.5 },
  { x: 12, h: 90, top: 20, body: 50, up: false, delay: 1.2, dur: 7.5 },
  { x: 21, h: 150, top: 35, body: 40, up: true, delay: 0.6, dur: 8 },
  { x: 31, h: 100, top: 25, body: 55, up: false, delay: 2, dur: 6 },
  { x: 42, h: 70, top: 30, body: 45, up: true, delay: 1.5, dur: 7 },
  { x: 55, h: 130, top: 20, body: 50, up: false, delay: 0.3, dur: 8.5 },
  { x: 66, h: 95, top: 35, body: 45, up: true, delay: 2.4, dur: 6.8 },
  { x: 76, h: 140, top: 25, body: 50, up: false, delay: 0.9, dur: 7.2 },
  { x: 86, h: 80, top: 30, body: 55, up: true, delay: 1.8, dur: 6.4 },
  { x: 94, h: 110, top: 20, body: 45, up: false, delay: 0.4, dur: 7.8 },
];

// The words that scroll along the ticker at the bottom (written twice in the page so the loop has no gap)
const TICKER = "404 NOT FOUND ▼ −100.00%   ·   PAGE ₹0.00   ·   VOLUME 0   ·   TRADING HALTED   ·   NO SUCH SYMBOL   ·   ";

// The "page not found" screen. It sits outside the app frame (an unknown address may be typed by a visitor who is not
// logged in), so it chooses its buttons by whether there is a session: the dashboard and stocks for a logged-in user,
// the home page and login for a visitor. While the session is still being restored it offers only the home page,
// which sends a logged-in user to the dashboard by itself, so the buttons never flicker.
export default function NotFoundPage() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Page not found · TradeOS";

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="not-found">
      {/* Decorative candlesticks swaying along the bottom edge */}
      <div className="not-found__candles" aria-hidden="true">
        {CANDLES.map((candle) => (
          <span
            key={candle.x}
            className={`not-found__candle ${candle.up ? "not-found__candle--up" : "not-found__candle--down"}`}
            style={{
              "--x": `${candle.x}%`,
              "--h": `${candle.h}px`,
              "--top": `${candle.top}%`,
              "--body": `${candle.body}%`,
              "--delay": `${candle.delay}s`,
              "--dur": `${candle.dur}s`,
            }}
          />
        ))}
      </div>

      <div className="not-found__content">
        <p className="not-found__label">
          <span className="not-found__dot" aria-hidden="true" />
          Symbol not found
        </p>

        <h1 className="not-found__heading">
          <span className="not-found__sr-only">404, page not found</span>

          {/* 4 ₹ 4: the zero is a rupee coin that bobs and flips */}
          <span className="not-found__code" aria-hidden="true">
            <span>4</span>
            <span className="not-found__coin">
              <span className="not-found__coin-face">₹</span>
            </span>
            <span>4</span>
          </span>
        </h1>

        <p className="not-found__title">This page isn&apos;t listed</p>

        <p className="not-found__text">
          It may have been delisted, renamed, or it never traded at all. Last price:{" "}
          <span className="not-found__price">₹0.00 (−100.00%)</span>.
        </p>

        <div className="not-found__actions">
          {isLoading ? (
            <Button as={Link} to="/" size="lg">
              Take me home
            </Button>
          ) : isAuthenticated ? (
            <>
              <Button as={Link} to="/dashboard" size="lg">
                Go to Dashboard
              </Button>
              <Button as={Link} to="/stocks" variant="secondary" size="lg">
                Browse stocks
              </Button>
            </>
          ) : (
            <>
              <Button as={Link} to="/" size="lg">
                Back to home
              </Button>
              <Button as={Link} to="/login" variant="secondary" size="lg">
                Log in
              </Button>
            </>
          )}
        </div>
      </div>

      {/* A ticker strip scrolling along the bottom */}
      <div className="not-found__ticker" aria-hidden="true">
        <div className="not-found__ticker-track">
          <span>{TICKER}</span>
          <span>{TICKER}</span>
        </div>
      </div>
    </main>
  );
}
