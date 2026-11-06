import Table from "./Table.jsx";
import "./Skeleton.css";

// Grey placeholder shapes shown while a page loads, laid out like the real content so nothing jumps when the data arrives.
// Wrap a whole loading layout in <SkeletonRegion label="..."> so screen readers hear one "Loading ..." message.

// One placeholder bar or block.
export default function Skeleton({
  width = "100%",
  height = 16,
  radius = "var(--radius-sm)",
  className = "",
}) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

// Wraps a loading layout: announces `label` to screen readers and marks the area busy.
export function SkeletonRegion({ label, children, className = "" }) {
  return (
    <div
      className={`skeleton-region ${className}`.trim()}
      role="status"
      aria-busy="true"
    >
      <span className="skeleton-region__label">{label}</span>
      {children}
    </div>
  );
}

// A page title and its subtitle line.
export function SkeletonHeading() {
  return (
    <div className="skeleton-heading">
      <Skeleton width={200} height={30} />
      <Skeleton width={320} height={14} />
    </div>
  );
}

// A table with a header row and `rows` rows, using the shared Table frame.
// `cardsBelow` (768, 1000 or 1100) is the screen width under which the real page shows cards instead of a table;
// below it the skeleton shows card-shaped blocks too, so the loading layout matches the real one.
export function SkeletonTable({ columns = 5, rows = 6, cardsBelow }) {
  const table = (
    <Table>
      <thead>
        <tr>
          {Array.from({ length: columns }, (_, column) => (
            <th key={column}>
              <Skeleton width={column === 0 ? 70 : 56} height={10} />
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {Array.from({ length: rows }, (_, row) => (
          <tr key={row}>
            {Array.from({ length: columns }, (_, column) => (
              <td key={column}>
                <Skeleton width={column === 0 ? 110 : 64} height={14} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );

  if (!cardsBelow) return table;

  return (
    <div className="skeleton-table" data-cards-below={cardsBelow}>
      <div className="skeleton-table__table">{table}</div>

      <div className="skeleton-table__cards">
        <SkeletonList rows={Math.min(rows, 4)} rowHeight={150} />
      </div>
    </div>
  );
}

// A row of summary cards (label, big number, caption).
export function SkeletonStats({ count = 4 }) {
  return (
    <div className="skeleton-stats">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-stats__card" key={index}>
          <Skeleton width={110} height={12} />
          <Skeleton width={150} height={28} />
          <Skeleton width={90} height={10} />
        </div>
      ))}
    </div>
  );
}

// A vertical list of rows (recent activity, watchlist preview, account sections).
export function SkeletonList({ rows = 4, rowHeight = 56 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={rowHeight} radius="var(--radius-md)" />
      ))}
    </div>
  );
}
