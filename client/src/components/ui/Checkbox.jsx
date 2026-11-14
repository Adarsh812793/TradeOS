import { Check } from "lucide-react";

import "./Input.css"; // the error, hint and smoothly opening message styles are shared with Input
import "./Checkbox.css";

// A tick box with a label, for a statement the person must agree to ("I understand ...").
// It is a real <input type="checkbox">, so the keyboard (Tab, Space), screen readers and form libraries all work; the
// visible box is only styling on top of it. The whole label is clickable, which makes a comfortable tap target.
//   label           what the box says: text, or text with a link in it
//   checked/onChange  it is a controlled field (pass `checked={value}`); onChange receives the normal change event
//   error / hint    like Input: shown under the box (the hint is hidden while there is an error)
//   animateMessage  the message area opens and closes smoothly and takes no room while empty (like Input)
//   `ref` and any other input props (onBlur, ...) are passed to the <input>, so a form can focus it when it has an error
export default function Checkbox({
  label,
  name,
  id, // optional: overrides the default id (checkbox-<name>)
  checked = false,
  onChange,
  error,
  hint,
  animateMessage = false,
  disabled = false,
  required = false,
  ref,
  ...rest
}) {
  const checkboxId = id ?? `checkbox-${name}`;

  // The line under the box: the error if there is one, otherwise the hint (or nothing)
  const message = error ? (
    <p id={`${checkboxId}-error`} className="form-field__error" role="alert">
      {error}
    </p>
  ) : (
    hint && (
      <p id={`${checkboxId}-hint`} className="form-field__hint">
        {hint}
      </p>
    )
  );

  const describedBy = error ? `${checkboxId}-error` : hint ? `${checkboxId}-hint` : undefined;

  return (
    <div className="checkbox-field">
      <label className={`checkbox-field__row ${disabled ? "checkbox-field__row--disabled" : ""}`.trim()} htmlFor={checkboxId}>
        <input
          {...rest}
          ref={ref}
          id={checkboxId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          aria-required={required || undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className="checkbox-field__input"
        />

        {/* The drawn box. It follows the real checkbox's state through CSS, and is hidden from screen readers. */}
        <span className={`checkbox-field__box ${error ? "checkbox-field__box--error" : ""}`.trim()} aria-hidden="true">
          <Check size={14} strokeWidth={3} />
        </span>

        <span className="checkbox-field__label">{label}</span>
      </label>

      {animateMessage ? (
        <div className="form-field__message" data-open={Boolean(message)}>
          <div className="form-field__message-inner">{message}</div>
        </div>
      ) : (
        message
      )}
    </div>
  );
}
