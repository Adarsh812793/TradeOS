import { Link } from "react-router-dom";

import Button from "../../../components/ui/Button.jsx";
import "./LandingFooter.css";

// The end of the page: one last call to action, then the legal line (what TradeOS is not) and the copyright.
export default function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container">
        <div className="landing-footer__cta">
          <h2 className="landing-footer__title">Start with ₹1,00,000 of virtual cash</h2>

          <div className="landing-footer__actions">
            <Button as={Link} to="/signup" size="lg">
              Create account
            </Button>
            <Button as={Link} to="/login" variant="secondary" size="lg">
              Log in
            </Button>
          </div>
        </div>

        <div className="landing-footer__legal">
          <p>
            TradeOS is a paper trading platform for learning. It is not a broker and does not give investment advice.
            Stock prices are simulated.
          </p>
          <p>© {new Date().getFullYear()} TradeOS</p>
        </div>
      </div>
    </footer>
  );
}
