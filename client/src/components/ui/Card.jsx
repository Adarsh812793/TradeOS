//Used to show portfolio,wallet balance in card formats

import "./Card.css";

export default function Card({
  children,
  className = "",
  padding = "md",
  shadow = false,
}) {
  const cardClass = [
    "card",
    `card--padding-${padding}`,
    shadow ? "card--shadow" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={cardClass}>
      {children}
    </section>
  );
}
