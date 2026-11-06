/* The shared button. Use it for every action; pick the variant by meaning, not by colour taste:
   primary   = the main action on a screen (marigold)
   secondary = a neutral action (cancel, edit)
   ghost     = a quiet action next to other content
   success   = buy       danger = sell / delete
   `loading` shows a spinner and blocks double clicks while a request runs; `block` makes it full width. */

import "./Button.css";

export default function Button({
  children,
  variant = "primary", // primary | secondary | ghost | success | danger
  size = "md", // sm | md | lg
  block = false, // full-width button (kept out of the DOM, so React does not warn about it)
  loading = false, // spinner + disabled while a request is running
  type = "button",
  disabled = false,
  onClick,
  className = "",
  ...rest //this attribute to make btn more resuable
}) {
  const buttonClass = [
    "btn",
    `btn--${variant}`,
    size !== "md" ? `btn--${size}` : "",
    block ? "btn--block" : "",
    loading ? "btn--loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={buttonClass}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      {...rest}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
