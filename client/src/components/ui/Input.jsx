
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import "./Input.css";

// A labelled text field with an error message, an optional hint and, for passwords, a show / hide button.
// `ref` and any other input props (onBlur, min, maxLength, ...) are passed straight to the <input>, so forms
// can focus the field that has an error.
export default function Input({
  label,
  name,
  id, // optional: overrides the default id (input-<name>)
  type = "text",
  placeholder = "",
  value,
  onChange,
  error,
  hint, // helper text under the field (hidden while there is an error)
  reserveErrorSpace = false, // keep room for one line of message under the field, so showing an error never moves what is below
  disabled = false,
  required = false,
  autoComplete, // hint for browsers and password managers, e.g. "current-password" or "new-password"
  ref,
  ...rest
}) {
  const inputId = id ?? `input-${name}`;
  const isPassword = type === "password";

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const inputType =
    isPassword && isPasswordVisible ? "text" : type;

  // The line under the field: the error if there is one, otherwise the hint (or nothing)
  const message = error ? (
    <p id={`${inputId}-error`} className="form-field__error" role="alert">
      {error}
    </p>
  ) : (
    hint && (
      <p id={`${inputId}-hint`} className="form-field__hint">
        {hint}
      </p>
    )
  );

  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

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
          {...rest}
          ref={ref}
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
          aria-describedby={describedBy}
          className={`form-field__input ${
            isPassword ? "form-field__input--password" : ""
          } ${error ? "form-field__input--error" : ""}`.trim()}
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
            {isPasswordVisible ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {/* Validation error, or the hint. With reserveErrorSpace the message sits in a slot that is always one line tall:
          otherwise an error appearing on blur pushes the next link or button down before the mouse is released, and
          that click is lost. */}
      {reserveErrorSpace ? (
        <div className="form-field__message-slot">{message}</div>
      ) : (
        message
      )}
    </div>
  );
}
