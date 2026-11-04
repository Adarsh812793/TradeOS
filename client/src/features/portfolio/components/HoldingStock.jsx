
// Avatar (first letter of the symbol, since there is no logo data) + symbol + company name.
// Styles live in HoldingsTable.css.
export default function HoldingStock({ stock }) {
  return (
    <div className="holding-stock">
      <span className="holding-stock__avatar" aria-hidden="true">
        {stock.symbol.charAt(0)}
      </span>

      <div className="holding-stock__text">
        <span className="holding-stock__symbol">{stock.symbol}</span>
        <span className="holding-stock__name">{stock.companyName}</span>
      </div>
    </div>
  );
}
