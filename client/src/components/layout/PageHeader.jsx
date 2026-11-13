import "./PageHeader.css";

// The heading of a list page (Orders, Transactions, Watchlist): the title and a one-line subtitle on the left, and
// whatever you pass as `aside` on the right (a count, the market badges). One component, so every list page has the
// same heading size, spacing and layout.
export default function PageHeader({ title, subtitle, aside }) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>

      {aside && <div className="page-header__aside">{aside}</div>}
    </header>
  );
}
