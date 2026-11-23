import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Input from "../../../components/ui/Input.jsx";
import Button from "../../../components/ui/Button.jsx";
import AuthMessage from "./AuthMessage.jsx";
import authApi from "../auth.api.js";
import useAuth from "../useAuth.js";
import useCountdown, { formatSeconds } from "../useCountdown.js";
import runAfterPointerRelease from "../runAfterPointerRelease.js";
import { resetPasswordSchema } from "../forgotPassword.validation.schema.js";
import { clearResetProgress, saveResetProgress } from "../resetProgress.js";

import "./CodeStep.css";

const CODE_LENGTH = 6;
const MAX_RESENDS = 5; // the server allows 5 new codes for one request; after that it stays silent, so we stop offering it

// Step 2 of forgot password: the 6-digit code from the email and the new password. A right code sets the password, signs
// every device out and sends the person to the login page. Props:
//   email            where the code was sent
//   cooldownSeconds  how long "Send a new code" stays locked at first (0 when the page was reopened and the time is unknown)
//   expiresInMinutes how long the code lives (optional, only for the sentence under the field)
//   onUseDifferentEmail  goes back to the email step
export default function ResetStep({ email, cooldownSeconds = 0, expiresInMinutes, onUseDifferentEmail }) {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const { secondsLeft, start: startCountdown } = useCountdown(cooldownSeconds);

  const [serverError, setServerError] = useState(""); // what the server said was wrong
  const [notice, setNotice] = useState(""); // good news: a new code was asked for
  const [isResending, setIsResending] = useState(false);
  const [resendsUsed, setResendsUsed] = useState(0);

  const resendsLeft = MAX_RESENDS - resendsUsed;
  const hasStartedRef = useRef(false);

  const {
    control,
    handleSubmit,
    setFocus,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm({
    // "onTouched": a field is checked when the visitor leaves it (and then on every change), not only on submit
    mode: "onTouched",
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: "", newPassword: "", confirmPassword: "" },
  });

  // The cursor is in the code field as soon as the step opens: the next thing they do is type
  useEffect(() => {
    if (hasStartedRef.current) return;

    hasStartedRef.current = true;
    setFocus("code");
  }, [setFocus]);

  // Sends the code and the new password. Any failure leaves the passwords in place and empties only the code field.
  async function onSubmit({ code, newPassword }) {
    setServerError("");
    setNotice("");

    try {
      await authApi.resetPassword({ email, code, newPassword });
    } catch (error) {
      setServerError(error.message || "Something went wrong. Please try again.");
      resetField("code", { defaultValue: "" });
      setFocus("code");
      return;
    }

    clearResetProgress();

    // Every device was signed out on the server. If this one was logged in (the reset was started from the Account page),
    // open the login page first (flushSync + await = it is really on screen) and only then clear the local login,
    // otherwise the guard on the login page would send the person back to the dashboard and the message would be lost.
    await navigate("/login", { replace: true, flushSync: true, state: { passwordReset: true } });

    if (isAuthenticated) await logout();
  }

  // Asks for a new code (the server holds the 60 second wait; the countdown only mirrors it)
  async function resend() {
    setIsResending(true);
    setServerError("");
    setNotice("");

    try {
      const response = await authApi.forgotPassword({ email });

      saveResetProgress(email);
      startCountdown(response.data?.resendAvailableInSeconds ?? 60);
      setResendsUsed((count) => count + 1);
      resetField("code", { defaultValue: "" });
      setNotice("If that email has an account, we sent a new code. The old one no longer works.");
      setFocus("code");
    } catch (error) {
      setServerError(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsResending(false);
    }
  }

  const canResend = secondsLeft === 0 && !isResending && !isSubmitting && resendsLeft > 0;

  return (
    <>
      <h2 className="auth-layout__heading">Check your email</h2>
      <p className="auth-layout__subheading code-step__lead">
        Step 2 of 2. If <strong className="code-step__email">{email}</strong> has a TradeOS account, we sent it a 6-digit code.
      </p>

      {notice && <AuthMessage variant="success">{notice}</AuthMessage>}
      {serverError && <AuthMessage variant="error">{serverError}</AuthMessage>}

      <form className="auth-layout__form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Controller
          name="code"
          control={control}
          render={({ field }) => (
            <Input
              label="Reset code"
              name={field.name}
              value={field.value}
              // digits only, so "482 913" pasted from the email works
              onChange={(event) => field.onChange(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
              onBlur={() => runAfterPointerRelease(field.onBlur)}
              ref={field.ref}
              error={errors.code?.message}
              hint={
                expiresInMinutes
                  ? `The code works for ${expiresInMinutes} minutes. Not there? Look in your spam folder.`
                  : "Not there? Look in your spam folder."
              }
              inputClassName="code-step__input"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              animateMessage
              required
            />
          )}
        />

        <Controller
          name="newPassword"
          control={control}
          render={({ field }) => (
            <Input
              label="New password"
              name={field.name}
              type="password"
              placeholder="At least 8 characters"
              value={field.value}
              onChange={field.onChange}
              onBlur={() => runAfterPointerRelease(field.onBlur)}
              ref={field.ref}
              error={errors.newPassword?.message}
              autoComplete="new-password"
              animateMessage
              required
            />
          )}
        />

        <Controller
          name="confirmPassword"
          control={control}
          render={({ field }) => (
            <Input
              label="Confirm new password"
              name={field.name}
              type="password"
              placeholder="Re-enter your new password"
              value={field.value}
              onChange={field.onChange}
              onBlur={() => runAfterPointerRelease(field.onBlur)}
              ref={field.ref}
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
              animateMessage
              required
            />
          )}
        />

        <Button type="submit" block loading={isSubmitting}>
          {isSubmitting ? "Resetting your password..." : "Reset password"}
        </Button>
      </form>

      <div className="code-step__actions">
        <Button type="button" variant="ghost" size="sm" onClick={resend} disabled={!canResend}>
          {resendsLeft <= 0
            ? "No more codes for now"
            : secondsLeft > 0
              ? `Send a new code in ${formatSeconds(secondsLeft)}`
              : "Send a new code"}
        </Button>

        <Button type="button" variant="ghost" size="sm" onClick={onUseDifferentEmail} disabled={isSubmitting}>
          Use a different email
        </Button>
      </div>
    </>
  );
}
