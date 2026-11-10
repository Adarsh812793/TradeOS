import { Check } from "lucide-react";

import "./PasswordRuleHint.css";

// The hint under the sign-up password field. It states the one rule ("at least 8 characters") and ticks as soon as the
// typed password meets it, so the visitor knows before pressing the button. `met` is true once it does.
// The tick is also said aloud ("done") for screen readers, which do not see colours or icons.
export default function PasswordRuleHint({ met }) {
  return (
    <span className={`password-rule ${met ? "password-rule--met" : ""}`.trim()}>
      {met && <Check size={14} aria-hidden="true" />}
      At least 8 characters
      {met && <span className="sr-only"> (done)</span>}
    </span>
  );
}
