import { Link } from "react-router-dom";

import MarketTerrain from "../features/landing/components/MarketTerrain.jsx";
import "./LandingPage.css";

// PLACEHOLDER: the real landing page (hero copy, sections, styling) replaces this in step 4 of Phase 5.
// For now it only hosts the terrain, so the terrain can be built and tested on a real page.
export default function LandingPage() {
  return (
    <main className="landing-placeholder">
      <section className="landing-placeholder__hero">
        <MarketTerrain />

        <div className="landing-placeholder__content">
          <h1>TradeOS</h1>
          <p>Practise trading Indian stocks with ₹1,00,000 of virtual money.</p>
          <Link to="/signup">Sign up</Link> <Link to="/login">Log in</Link>
        </div>
      </section>

      {/* Empty space below the hero, so the hero can be scrolled out of view (this is how the pause is tested) */}
      <div className="landing-placeholder__spacer" aria-hidden="true" />
    </main>
  );
}
