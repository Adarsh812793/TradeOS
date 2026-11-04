/* File contains reusable button component, use it accordingly in diffirent webpages  */

import "./Button.css";

export default function Button({
  children,
  variant = "primary",
  type = "button",
  disabled = false,
  onClick,
  className = "",
  ...rest //this attribute to make btn more resuable
}) {
  const buttonClass = `btn btn--${variant} ${className}`.trim();

  return (
    <button
      type={type}
      className={buttonClass}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
