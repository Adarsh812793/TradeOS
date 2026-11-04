
import "./LoadingSpinner.css";

export default function LoadingSpinner({
  size = 24,   //diameter size of spinner
  label = "Loading", //lable to use
  className = "", //optional additional class for future add ons
}) {
  return (
    <div
      className={`loading-spinner ${className}`.trim()}
      role="status"
      aria-label={label}
    >
      <span
        className="loading-spinner__circle"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />

      <span className="loading-spinner__label">
        {label}
      </span>
    </div>
  );
}
