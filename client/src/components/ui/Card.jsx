//Used to show portfolio,wallet balance in card formats

import "./Card.css";

// A panel on the page background. `as` picks the HTML element (section by default; use "article" or "div" when a
// <section> would be wrong), padding is none | sm | md | lg, and shadow is only for things that should float.
export default function Card({
  as: Element = "section",
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
    <Element className={cardClass}>
      {children}
    </Element>
  );
}
