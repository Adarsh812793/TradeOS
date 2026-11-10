import "./SimulatedNotice.css";

// The three things a visitor must understand before signing up. Plain statements, not fine print.
const POINTS = [
  {
    lead: "No real money.",
    text: "Your ₹1,00,000 is virtual. Nothing is sent to a broker or an exchange, and nothing here can be withdrawn.",
  },
  {
    lead: "Prices are made up.",
    text: "During market hours each stock's price moves a little at random every 15 seconds. It does not follow the real market.",
  },
  {
    lead: "Not a guide to real trading.",
    text: "How you do here says nothing about how you would do with real money. TradeOS is not a broker and gives no investment advice.",
  },
];

// A full-width band that explains, in its own section and not in small print, that the money and the stock prices are
// simulated. (When sign-up gets its "I understand" checkbox, it should repeat this wording.)
export default function SimulatedNotice() {
  return (
    <section className="simulated-notice" aria-labelledby="simulated-title">
      <div className="landing-container simulated-notice__grid">
        <div>
          <h2 id="simulated-title" className="landing-section__title">
            The prices here are simulated
          </h2>
          <p className="landing-section__intro">
            TradeOS does not use real exchange prices. It generates its own, so nothing here depends on a market data
            vendor.
          </p>
        </div>

        <ul className="simulated-notice__points" role="list">
          {POINTS.map((point) => (
            <li key={point.lead} className="simulated-notice__point">
              <strong>{point.lead}</strong> {point.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="landing-container">
        <p className="simulated-notice__footnote">
          The one exception is the NIFTY 50 and SENSEX levels at the top of the app: when they are available, they come
          from a market data provider. Stock prices never do.
        </p>
      </div>
    </section>
  );
}
