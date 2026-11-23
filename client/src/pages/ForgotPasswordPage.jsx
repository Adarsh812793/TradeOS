import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import AuthLayout from "../features/auth/components/AuthLayout.jsx";
import AuthMessage from "../features/auth/components/AuthMessage.jsx";
import ResetStep from "../features/auth/components/ResetStep.jsx";
import authApi from "../features/auth/auth.api.js";
import { forgotEmailSchema } from "../features/auth/forgotPassword.validation.schema.js";
import useAutoFocusField from "../features/auth/useAutoFocusField.js";
import runAfterPointerRelease from "../features/auth/runAfterPointerRelease.js";
import { clearResetProgress, readResetProgress, saveResetProgress } from "../features/auth/resetProgress.js";

// The facts on the brand side: what happens when a password is reset
const RESET_POINTS = [
  "We email a 6-digit code that works for 10 minutes",
  "A reset signs you out of every device",
  "Your virtual wallet and orders are not touched",
];

// The forgot-password page, in two steps: 1) the email, 2) the emailed code and a new password. It is also reachable
// while logged in (from the Account page). The server answers the same whether or not the email has an account, so the
// second step says "if this email has an account" and never confirms it.
export default function ForgotPasswordPage() {
  // The email a code was asked for, or null while the email form is showing. A reload comes back to the code step
  // because the email is remembered for this tab (see resetProgress.js).
  const [savedEmail] = useState(() => readResetProgress());
  const [sent, setSent] = useState(() =>
    savedEmail ? { email: savedEmail, cooldownSeconds: 0, expiresInMinutes: undefined } : null,
  );

  const [serverError, setServerError] = useState("");

  const {
    control,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onTouched",
    resolver: zodResolver(forgotEmailSchema),
    defaultValues: { email: savedEmail ?? "" },
  });

  useAutoFocusField(setFocus, "email"); // the cursor starts in the email field (on devices with a mouse)

  // Asks the server to email a code, then shows the code step
  async function onSubmit({ email }) {
    setServerError("");

    try {
      const response = await authApi.forgotPassword({ email });

      saveResetProgress(email);
      setSent({
        email,
        cooldownSeconds: response.data?.resendAvailableInSeconds ?? 60,
        expiresInMinutes: response.data?.codeExpiresInMinutes,
      });
    } catch (error) {
      setServerError(error.message || "Something went wrong. Please try again.");
    }
  }

  // "Use a different email": back to the email form with what they typed still in it
  function useDifferentEmail() {
    clearResetProgress();
    setSent(null);
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      intro="It happens. Reset it with a code we send to your email, then log in with the new one."
      points={RESET_POINTS}
    >
      <Card padding="lg">
        {sent ? (
          <ResetStep
            email={sent.email}
            cooldownSeconds={sent.cooldownSeconds}
            expiresInMinutes={sent.expiresInMinutes}
            onUseDifferentEmail={useDifferentEmail}
          />
        ) : (
          <>
            <h2 className="auth-layout__heading">Reset your password</h2>
            <p className="auth-layout__subheading">Step 1 of 2. Enter the email of your TradeOS account.</p>

            {serverError && <AuthMessage variant="error">{serverError}</AuthMessage>}

            <form className="auth-layout__form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Email"
                    name={field.name}
                    type="email"
                    placeholder="you@example.com"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={() => runAfterPointerRelease(field.onBlur)}
                    ref={field.ref}
                    error={errors.email?.message}
                    autoComplete="email"
                    animateMessage
                    required
                  />
                )}
              />

              <Button type="submit" block loading={isSubmitting}>
                {isSubmitting ? "Sending your code..." : "Send code"}
              </Button>
            </form>

            <p className="auth-layout__switch">
              Remembered it? <Link to="/login">Log in</Link>
            </p>
          </>
        )}
      </Card>
    </AuthLayout>
  );
}
