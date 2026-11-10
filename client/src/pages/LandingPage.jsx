import { useEffect } from "react";

import LandingHeader from "../features/landing/components/LandingHeader.jsx";
import LandingHero from "../features/landing/components/LandingHero.jsx";
import HowItWorks from "../features/landing/components/HowItWorks.jsx";
import Features from "../features/landing/components/Features.jsx";
import SimulatedNotice from "../features/landing/components/SimulatedNotice.jsx";
import LandingFooter from "../features/landing/components/LandingFooter.jsx";
import "./LandingPage.css";

// The public front page at "/", for visitors who are not logged in (logged-in users are sent to the dashboard).
// It only puts the sections in order; each section lives in features/landing/components/.
export default function LandingPage() {
  // A tab title that says what the page is, restored when the visitor moves on
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "TradeOS: practise trading with virtual money";

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="landing-page">
      <LandingHeader />

      <main>
        <LandingHero />
        <HowItWorks />
        <Features />
        <SimulatedNotice />
      </main>

      <LandingFooter />
    </div>
  );
}
