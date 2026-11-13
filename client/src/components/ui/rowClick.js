// Opens a stock (or any item) when a row or card is clicked anywhere, except on its own buttons and links: those keep
// their own behaviour (Buy, Sell, the watchlist bookmark, the stock link itself).
// Keyboard users are not affected: the stock name inside the row is still a link they can Tab to and press Enter on.
export function handleRowClick(event, navigate, path) {
  if (event.target.closest("a, button")) return;

  navigate(path);
}
