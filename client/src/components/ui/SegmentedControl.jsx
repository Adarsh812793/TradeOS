import "./SegmentedControl.css";

// A row of connected options where exactly one is selected (Buy | Sell, 1D | 1W | 1M ...).
// `options` is a list of { value, label, tone? }; tone "success" or "danger" colours the selected option green or red.
// It behaves like a group of radio buttons: Tab reaches the selected option, the arrow keys move the selection.
export default function SegmentedControl({
  label, // what the group is for, read out by screen readers (e.g. "Order type")
  options,
  value,
  onChange, // receives the chosen value
  size = "md", // sm | md
  fill = false, // stretch to the full width, options share it equally
  className = "",
}) {
  // Arrow keys select the previous / next option and move focus with the selection
  const handleKeyDown = (event) => {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const backward = event.key === "ArrowLeft" || event.key === "ArrowUp";

    if (!forward && !backward) return;

    event.preventDefault();

    const current = options.findIndex((option) => option.value === value);
    const next = (current + (forward ? 1 : -1) + options.length) % options.length;

    onChange(options[next].value);
    event.currentTarget.querySelectorAll('[role="radio"]')[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`segmented segmented--${size} ${fill ? "segmented--fill" : ""} ${className}`.trim()}
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            className={`segmented__option ${
              isSelected ? "segmented__option--selected" : ""
            } ${option.tone ? `segmented__option--${option.tone}` : ""}`.trim()}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
