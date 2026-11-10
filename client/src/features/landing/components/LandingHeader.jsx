import { Link } from "react-router-dom";
import { ChartNoAxesCombined } from "lucide-react";

import Button from "../../../components/ui/Button.jsx";
import "./LandingHeader.css";

// The top bar of the landing page: the brand on the left, Log in and Sign up on the right. It floats over the hero.
export default function LandingHeader() {
  return (
    <header className="landing-header">
      <div className="landing-container landing-header__inner">
        <Link to="/" className="landing-header__brand" aria-label="TradeOS home">
          <span className="landing-header__mark" aria-hidden="true">
            <ChartNoAxesCombined size={20} />
          </span>
          TradeOS
        </Link>

        <nav className="landing-header__actions" aria-label="Account">
          <Button as={Link} to="/login" variant="ghost">
            Log in
          </Button>
          <Button as={Link} to="/signup">
            Sign up
          </Button>
        </nav>
      </div>
    </header>
  );
}
