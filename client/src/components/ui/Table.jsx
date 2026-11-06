import "./Table.css";

// The shared look for data tables: a bordered panel that scrolls sideways inside itself, a quiet header row, thin row
// dividers and a hover highlight. You write the <thead> and <tbody> (and your own rows); this only provides the frame.
// Cell helper classes: `data-table__num` (right-aligned numbers in the mono font) and `data-table__actions` (right-aligned buttons).
export default function Table({
  children,
  caption, // describes the table for screen readers (not shown)
  minWidth, // a width below which the table scrolls instead of squeezing, e.g. 900
  className = "",
}) {
  return (
    <div className={`data-table-wrapper ${className}`.trim()}>
      <table
        className="data-table"
        style={minWidth ? { minWidth } : undefined}
      >
        {caption && <caption className="data-table__caption">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}
