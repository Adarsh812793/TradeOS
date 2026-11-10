import { Link } from "react-router-dom";

// PLACEHOLDER: the real landing page (3D terrain, sections) replaces this in step 4 of Phase 5.
// It exists now so the routing (who sees "/") can be built and tested first.
export default function LandingPage() {
  return (
    <main>
      <h1>TradeOS</h1>
      <p>Practise trading Indian stocks with ₹1,00,000 of virtual money.</p>
      <Link to="/signup">Sign up</Link> <Link to="/login">Log in</Link>
    </main>
  );
}
