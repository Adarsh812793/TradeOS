import "./AuthMessage.css";

// A short message above a sign-in or sign-up form. `variant` picks the meaning:
//   success  something worked (for example "Account created")
//   info     neutral news (signed out after inactivity, account deleted)
//   error    something went wrong (announced to screen readers at once, as an alert)
export default function AuthMessage({ variant = "info", children }) {
  return (
    <p className={`auth-message auth-message--${variant}`} role={variant === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}
