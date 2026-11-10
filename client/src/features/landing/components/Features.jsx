import "./Features.css";

// What the app offers, in plain words. No icons: each item is a short title and one sentence.
const FEATURES = [
  {
    title: "Portfolio and profit & loss",
    text: "See what you own, what you paid and what it is worth now, stock by stock and in total.",
  },
  {
    title: "Watchlist",
    text: "Save the stocks you want to follow before you decide to buy.",
  },
  {
    title: "Orders and transactions",
    text: "Every order you place and every rupee that moved in or out of your wallet, in one history.",
  },
  {
    title: "Market hours",
    text: "Prices move and orders are accepted only while the market is open, so practising feels like the real thing.",
  },
];

// "What you can do": a two-column list of the four main features.
export default function Features() {
  return (
    <section className="landing-section" aria-labelledby="features-title">
      <div className="landing-container">
        <h2 id="features-title" className="landing-section__title">
          What you can do
        </h2>

        <ul className="features-list" role="list">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="features-list__item">
              <h3 className="features-list__title">{feature.title}</h3>
              <p className="features-list__text">{feature.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
