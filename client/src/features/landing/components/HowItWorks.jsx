import "./HowItWorks.css";

// The three steps from sign-up to results. Kept as plain data so the copy is easy to read and change.
const STEPS = [
  {
    title: "Sign up",
    text: "Create an account and your wallet starts with ₹1,00,000 of virtual cash.",
  },
  {
    title: "Trade during market hours",
    text: "Choose from Indian stocks and place buy and sell orders. As on the real exchange, trading runs on weekdays from 9:15 AM to 3:30 PM IST, except exchange holidays.",
  },
  {
    title: "Follow the result",
    text: "Your holdings, profit and loss, orders and transactions update as the prices move.",
  },
];

// "How it works": a numbered list of three steps. The numbers are decoration (the list is already ordered).
export default function HowItWorks() {
  return (
    <section className="landing-section" aria-labelledby="how-it-works-title">
      <div className="landing-container">
        <h2 id="how-it-works-title" className="landing-section__title">
          How it works
        </h2>

        <ol className="how-steps" role="list">
          {STEPS.map((step, index) => (
            <li key={step.title} className="how-steps__item">
              <span className="how-steps__number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="how-steps__title">{step.title}</h3>
              <p className="how-steps__text">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
