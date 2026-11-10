import { Link } from "react-router-dom";

import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import MarketTerrain from "./MarketTerrain.jsx";
import "./LandingHero.css";

// The first screen: the headline, one sentence of explanation and the two ways in, over the 3D terrain.
// The terrain is decoration. The two badges and the line under the buttons say plainly that the money and the
// prices are not real, before anyone has to read further.
export default function LandingHero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-hero-title">
      <MarketTerrain />

      {/* Dark gradients over the terrain: they keep the text readable and blend the picture into the page */}
      <div className="landing-hero__shade" aria-hidden="true" />

      <div className="landing-container landing-hero__content">
        <p className="landing-hero__badges">
          <Badge variant="neutral">Virtual money</Badge>
          <Badge variant="neutral">Simulated prices</Badge>
        </p>

        <h1 id="landing-hero-title" className="landing-hero__title">
          Practise trading Indian stocks with ₹1,00,000 of virtual money
        </h1>

        <p className="landing-hero__lead">
          Buy and sell stocks, follow your portfolio&apos;s profit and loss, and see how your decisions play out.
          Nothing here is real: no real money, no real orders.
        </p>

        <div className="landing-hero__actions">
          <Button as={Link} to="/signup" size="lg">
            Create account
          </Button>
          <Button as={Link} to="/login" variant="secondary" size="lg">
            Log in
          </Button>
        </div>

        <p className="landing-hero__note">No card or deposit needed.</p>
      </div>
    </section>
  );
}
