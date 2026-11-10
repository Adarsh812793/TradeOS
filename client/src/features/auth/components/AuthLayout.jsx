import { Link } from "react-router-dom";
import { ChartNoAxesCombined } from "lucide-react";

import stillImage from "../../../assets/terrain-still.webp";
import "./AuthLayout.css";

// The frame Login and Signup share: ONE terrain picture (the landing page's) behind the whole page, fading into the
// background with gradients so there is no hard edge, with the brand text on one side and the form on the other.
// On a phone the brand text becomes a slim header, and the picture dissolves downwards into the form.
//   title    the page's one <h1>, shown on the brand side
//   intro    an optional sentence under it (hidden on phones, to keep the form near the top)
//   points   an optional list of short facts (also hidden on phones)
//   children the form itself, built by the page (a Card with its fields)
// Under the form it always says that the money is virtual and the prices are simulated, so nobody enters an account
// without having seen it. (When Signup gets its terms checkbox, that wording belongs there too.)
export default function AuthLayout({ title, intro, points = [], children }) {
  return (
    <main className="auth-layout">
      {/* Decorative, behind everything: the same picture as the landing page, so the visitor feels they are still in the
          same place. The shade over it is what blends it into the page. */}
      <div className="auth-layout__backdrop" aria-hidden="true">
        <img
          className="auth-layout__image"
          src={stillImage}
          alt=""
          width="1600"
          height="900"
          decoding="async"
          fetchPriority="low"
        />
        <div className="auth-layout__shade" />
      </div>

      <section className="auth-layout__brand">
        <div className="auth-layout__brand-content">
          <Link to="/" className="auth-layout__logo" aria-label="TradeOS home">
            <span className="auth-layout__logo-mark" aria-hidden="true">
              <ChartNoAxesCombined size={20} />
            </span>
            TradeOS
          </Link>

          <div>
            <h1 className="auth-layout__title">{title}</h1>
            {intro && <p className="auth-layout__lead">{intro}</p>}
          </div>

          {points.length > 0 && (
            <ul className="auth-layout__points" role="list">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="auth-layout__panel">
        <div className="auth-layout__panel-inner">
          {children}

          <p className="auth-layout__note">
            TradeOS is paper trading: the money is virtual and stock prices are simulated.
          </p>
        </div>
      </section>
    </main>
  );
}
