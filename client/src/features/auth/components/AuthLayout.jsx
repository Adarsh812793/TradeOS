import { Link } from "react-router-dom";
import { ChartNoAxesCombined } from "lucide-react";

import stillImage from "../../../assets/terrain-still.webp";
import "./AuthLayout.css";

// The frame Login and Signup share: a brand side (logo, headline and the terrain picture from the landing page) next
// to the form side. On a phone the brand side shrinks to a slim banner above the form.
//   title    the page's one <h1>, shown on the brand side
//   intro    an optional sentence under it (hidden on phones, to keep the form near the top)
//   points   an optional list of short facts (also hidden on phones)
//   children the form itself, built by the page (a Card with its fields)
// Under the form it always says that the money is virtual and the prices are simulated, so nobody enters an account
// without having seen it. (When Signup gets its terms checkbox, that wording belongs there too.)
export default function AuthLayout({ title, intro, points = [], children }) {
  return (
    <main className="auth-layout">
      <section className="auth-layout__brand">
        {/* decorative: the same picture as the landing page, so the visitor feels they are still in the same place */}
        <img
          className="auth-layout__image"
          src={stillImage}
          alt=""
          width="1600"
          height="900"
          decoding="async"
          fetchPriority="low"
        />
        <div className="auth-layout__shade" aria-hidden="true" />

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
