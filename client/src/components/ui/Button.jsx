/* The shared button. Use it for every action; pick the variant by meaning, not by colour taste:
   primary   = the main action on a screen (marigold)
   secondary = a neutral action (cancel, edit)
   ghost     = a quiet action next to other content
   success   = buy       danger = sell / delete
   `loading` shows a spinner and blocks double clicks while a request runs; `block` makes it full width.
   `as` renders something other than a <button>, for navigation: <Button as={Link} to="/signup">. A link is the right
   element for going to another page (it can be opened in a new tab and is announced as a link), but it looks the
   same. `disabled` and `loading` only apply to real buttons. */

import "./Button.css";

export default function Button({
  as: Component = "button", // "button" (default), or a Link / "a" to look like a button but navigate
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

  // `type` and `disabled` exist only on real buttons; on a link they would be meaningless attributes
  const buttonOnlyProps = Component === "button" ? { type, disabled: disabled || loading } : {};

  return (
    <Component
      className={buttonClass}
      aria-busy={loading || undefined}
      onClick={onClick}
      {...buttonOnlyProps}
      {...rest}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {children}
    </Component>
  );
}
