import "./DataCard.css";

// The phone version of a table row: a header (title, optional subtitle and badge), a grid of label and value pairs and an
// optional footer for status and actions. Orders, Transactions and the Watchlist use it, so their cards look alike.
//   title / subtitle  e.g. the stock symbol and company name          badge  a <Badge> shown at the top right
//   items             [{ label, value, wide?, tone? }]; `wide` spans both columns, `tone` colours the value
//                     (profit | loss), for a signed amount
//   footer            anything: a status badge and a date, buttons ...
export default function DataCard({
  as: Element = "article",
  title,
  subtitle,
  badge,
  items = [],
  footer,
  className = "",
}) {
  return (
    <Element className={`data-card ${className}`.trim()}>
      <div className="data-card__header">
        <div className="data-card__heading">
          <h3 className="data-card__title">{title}</h3>
          {subtitle && <p className="data-card__subtitle">{subtitle}</p>}
        </div>

        {badge}
      </div>

      {items.length > 0 && (
        <dl className="data-card__items">
          {items.map((item) => (
            <div
              key={item.label}
              className={`data-card__item ${item.wide ? "data-card__item--wide" : ""}`.trim()}
            >
              <dt>{item.label}</dt>
              <dd className={item.tone ? `data-card__value--${item.tone}` : ""}>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {footer && <div className="data-card__footer">{footer}</div>}
    </Element>
  );
}
