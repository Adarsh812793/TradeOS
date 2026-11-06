import "./ResultState.css";

// The outcome of an action: an animated tick for success (like a completed payment) or a cross for failure,
// with a title, a short description and optional details underneath (pass them as children).
// Use it inside a dialog or on a page; it announces itself to screen readers.
export default function ResultState({
  kind = "success", // success | error
  title,
  description,
  children,
}) {
  const isSuccess = kind === "success";

  return (
    <div
      className={`result-state result-state--${kind}`}
      role={isSuccess ? "status" : "alert"}
    >
      <svg
        className="result-state__icon"
        viewBox="0 0 64 64"
        width="72"
        height="72"
        aria-hidden="true"
      >
        <circle className="result-state__disc" cx="32" cy="32" r="30" />
        <circle className="result-state__ring" cx="32" cy="32" r="28" />
        {isSuccess ? (
          <path className="result-state__mark" d="M20 33 L28.5 41.5 L44.5 24" />
        ) : (
          <path className="result-state__mark" d="M23 23 L41 41 M41 23 L23 41" />
        )}
      </svg>

      <h3 className="result-state__title">{title}</h3>

      {description && (
        <p className="result-state__description">{description}</p>
      )}

      {children && <div className="result-state__details">{children}</div>}
    </div>
  );
}
