import LoadingSpinner from "../ui/LoadingSpinner.jsx";

// Shown while the very first page's code downloads, before any layout exists.
export default function AppLoading() {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100dvh",
      }}
    >
      <LoadingSpinner label="Loading TradeOS" />
    </div>
  );
}
