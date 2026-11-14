import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Input from "../../../components/ui/Input.jsx";
import Button from "../../../components/ui/Button.jsx";
import AuthMessage from "./AuthMessage.jsx";
import authApi from "../auth.api.js";
import useAuth from "../useAuth.js";
import useCountdown, { formatSeconds } from "../useCountdown.js";
import { describeRegistrationError } from "../registration.errors.js";
import { clearSignupProgress, saveSignupProgress } from "../signupProgress.js";

import "./CodeStep.css";

const CODE_LENGTH = 6;

// Step 2 of the sign-up: the person types the 6-digit code that was emailed to them. A correct code creates the account
// and logs them in. Props:
//   email            where the code was sent
//   cooldownSeconds  how long "Resend" stays locked at first (0 when the page was reopened and the time is unknown)
//   expiresInMinutes how long the code lives (optional, only for the sentence under the field)
//   onUseDifferentEmail  goes back to the details form (what was typed there is still in it)
//   onRestart(message)   the sign-up is gone on the server: go back to the details form and say why
export default function CodeStep({ email, cooldownSeconds = 0, expiresInMinutes, onUseDifferentEmail, onRestart }) {
  const navigate = useNavigate();
  const { verifyRegistration } = useAuth();
  const { secondsLeft, start: startCountdown } = useCountdown(cooldownSeconds);

  const [code, setCode] = useState("");
  const [error, setError] = useState(""); // what is wrong with the code (or the sign-up)
  const [notice, setNotice] = useState(""); // good news: a new code was sent
  const [showLogin, setShowLogin] = useState(false); // this email already has an account
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const inputRef = useRef(null);
  const isVerifyingRef = useRef(false); // blocks a second request while one is running (typing the 6th digit AND pressing Enter)

  // The cursor is in the code field as soon as the step opens: the next thing they do is type
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Sends the code. A wrong code clears the field and puts the cursor back, so they can type again straight away.
  async function verify(value) {
    if (isVerifyingRef.current || value.length !== CODE_LENGTH) return;

    isVerifyingRef.current = true;
    setIsVerifying(true);
    setError("");
    setNotice("");

    try {
      await verifyRegistration({ email, code: value });

      clearSignupProgress();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const problem = describeRegistrationError(err, "verify");

      if (problem.action === "restart") {
        clearSignupProgress();
        onRestart(problem.message);
        return;
      }

      if (problem.action === "login") {
        clearSignupProgress();
        setShowLogin(true);
      }

      setError(problem.message);
      setCode("");

      // a few seconds of "wait" can come with the answer too
      if (problem.retryAfterSeconds) startCountdown(problem.retryAfterSeconds);

      isVerifyingRef.current = false;
      setIsVerifying(false);
      inputRef.current?.focus();
    }
  }

  // Keeps only digits (so "482 913" pasted from the email works) and sends as soon as the sixth one is in
  function handleChange(event) {
    const digits = event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);

    setCode(digits);
    setError("");

    if (digits.length === CODE_LENGTH) verify(digits);
  }

  function handleSubmit(event) {
    event.preventDefault();
    verify(code);
  }

  // Asks for a new code (the server holds the 60 second wait; the countdown only mirrors it)
  async function resend() {
    setIsResending(true);
    setError("");
    setNotice("");

    try {
      const response = await authApi.resendCode({ email });

      saveSignupProgress(email);
      startCountdown(response.data?.resendAvailableInSeconds ?? 60);
      setCode("");
      setNotice("We sent a new code. The old one no longer works.");
      inputRef.current?.focus();
    } catch (err) {
      const problem = describeRegistrationError(err, "start");

      if (problem.action === "restart") {
        clearSignupProgress();
        onRestart(problem.message);
        return;
      }

      if (problem.action === "login") setShowLogin(true);
      if (problem.retryAfterSeconds) startCountdown(problem.retryAfterSeconds);

      setError(problem.message);
    } finally {
      setIsResending(false);
    }
  }

  const canResend = secondsLeft === 0 && !isResending && !isVerifying;

  return (
    <>
      <h2 className="auth-layout__heading">Check your email</h2>
      <p className="auth-layout__subheading code-step__lead">
        Step 2 of 2. We sent a 6-digit code to <strong className="code-step__email">{email}</strong>.
      </p>

      {notice && <AuthMessage variant="success">{notice}</AuthMessage>}

      <form className="auth-layout__form" onSubmit={handleSubmit} noValidate>
        <Input
          label="Verification code"
          name="code"
          value={code}
          onChange={handleChange}
          ref={inputRef}
          error={error}
          hint={
            expiresInMinutes
              ? `The code works for ${expiresInMinutes} minutes. Not there? Look in your spam folder.`
              : "Not there? Look in your spam folder."
          }
          inputClassName="code-step__input"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          readOnly={isVerifying} // not disabled: a disabled field loses the cursor, and a wrong code must leave it in place
          animateMessage
          required
        />

        {showLogin && (
          <p className="code-step__login">
            <Link to="/login">Log in instead</Link>
          </p>
        )}

        <Button type="submit" block loading={isVerifying} disabled={code.length !== CODE_LENGTH}>
          {isVerifying ? "Creating your account..." : "Verify and create account"}
        </Button>
      </form>

      <div className="code-step__actions">
        <Button type="button" variant="ghost" size="sm" onClick={resend} disabled={!canResend}>
          {secondsLeft > 0 ? `Resend code in ${formatSeconds(secondsLeft)}` : "Send a new code"}
        </Button>

        <Button type="button" variant="ghost" size="sm" onClick={onUseDifferentEmail} disabled={isVerifying}>
          Use a different email
        </Button>
      </div>
    </>
  );
}
