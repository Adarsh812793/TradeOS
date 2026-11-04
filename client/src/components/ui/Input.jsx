
import { useState } from "react";
import "./Input.css";

export default function Input({
  label,
  name,
  type = "text",
  placeholder = "",
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  autoComplete, // hint for browsers and password managers, e.g. "current-password" or "new-password"
}) {
  const inputId = `input-${name}`;
  const isPassword = type === "password";

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const inputType =
    isPassword && isPasswordVisible ? "text" : type;

  return (
    <div className="form-field">
      {label && (
        <label className="form-field__label" htmlFor={inputId}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
      )}

      {/* Input and optional password visibility toggle */}
      <div className="form-field__input-wrapper">
        <input
          id={inputId}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`form-field__input ${
            error ? "form-field__input--error" : ""
          }`}
        />

        {isPassword && (
          <button
            type="button"
            className="form-field__password-toggle"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            disabled={disabled}
            aria-label={
              isPasswordVisible ? "Hide password" : "Show password"
            }
            aria-pressed={isPasswordVisible}
          >
            {isPasswordVisible ? "Hide" : "Show"}
          </button>
        )}
      </div>

      {/* Validation error */}
      {error && (
        <p
          id={`${inputId}-error`}
          className="form-field__error"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
