import { ChevronDown } from "lucide-react";

import "./Select.css";

// A styled dropdown built on the native <select> (so it works with the keyboard, on phones and with screen readers).
// `options` is a list of { value, label }; `onChange` receives the chosen value (a string), not the event.
// `inline` puts the label beside the dropdown instead of above it.
export default function Select({
  label,
  id,
  value,
  onChange,
  options,
  disabled = false,
  inline = false,
  className = "",
  ...rest
}) {
  return (
    <div
      className={`select-field ${inline ? "select-field--inline" : ""} ${className}`.trim()}
    >
      {label && (
        <label className="select-field__label" htmlFor={id}>
          {label}
        </label>
      )}

      <div className="select-field__control">
        <select
          {...rest}
          id={id}
          className="select-field__select"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          className="select-field__chevron"
          size={16}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
