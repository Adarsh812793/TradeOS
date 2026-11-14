import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import Checkbox from "../components/ui/Checkbox.jsx";
import AuthLayout from "../features/auth/components/AuthLayout.jsx";
import AuthMessage from "../features/auth/components/AuthMessage.jsx";
import CodeStep from "../features/auth/components/CodeStep.jsx";
import PasswordRuleHint from "../features/auth/components/PasswordRuleHint.jsx";
import signupSchema from "../features/auth/signup.validation.schema.js";
import authApi from "../features/auth/auth.api.js";
import useAutoFocusField from "../features/auth/useAutoFocusField.js";
import runAfterPointerRelease from "../features/auth/runAfterPointerRelease.js";
import { describeRegistrationError } from "../features/auth/registration.errors.js";
import {
  clearSignupProgress,
  readSignupProgress,
  saveSignupProgress,
} from "../features/auth/signupProgress.js";

// What the brand side says about the account: the three facts a new user should know before signing up
const SIGNUP_POINTS = [
  "A virtual wallet of ₹1,00,000",
  "Buy and sell on weekdays, 9:15 AM to 3:30 PM IST",
  "Stock prices are simulated by TradeOS",
];

// The sign-up page, in two steps: 1) name, email, password and the agreement, 2) the 6-digit code emailed to them.
// The account is only created (and the person logged in) when the right code is entered.
export default function SignupPage() {
  // The email a code was sent to, or null while the details form is showing. A reload comes back to the code step
  // because the email is remembered for this tab (see signupProgress.js).
  const [savedEmail] = useState(() => readSignupProgress());
  const [sent, setSent] = useState(() =>
    savedEmail ? { email: savedEmail, cooldownSeconds: 0, expiresInMinutes: undefined } : null,
  );

  const [serverError, setServerError] = useState(""); // an error message received from the backend
  const [hasAccount, setHasAccount] = useState(false); // that error is "this email already has an account"

  const {
    control,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({
    // "onTouched": a field is checked when the visitor leaves it (and then on every change), not only on submit
    mode: "onTouched",
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: savedEmail ?? "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
    },
  });

  useAutoFocusField(setFocus, "name"); // the cursor starts in the first field (on devices with a mouse)

  // The password as it is typed, so the hint under it can tick when the rule is met
  const typedPassword = useWatch({ control, name: "password" });
  const acceptedTerms = useWatch({ control, name: "acceptedTerms" });

  // Asks the server to email a code for these details (no account is created yet), then shows the code step.
  async function onSubmit(data) {
    setServerError("");
    setHasAccount(false);

    try {
      // confirmPassword and the tick box are only for the form; the API needs just these three
      const { name, email, password } = data;

      const response = await authApi.startRegistration({ name, email, password });

      saveSignupProgress(email);
      setSent({
        email,
        cooldownSeconds: response.data?.resendAvailableInSeconds ?? 60,
        expiresInMinutes: response.data?.codeExpiresInMinutes,
      });
    } catch (error) {
      const problem = describeRegistrationError(error, "start");

      setServerError(problem.message);
      setHasAccount(problem.action === "login");
    }
  }

  // "Use a different email": back to the form with everything they typed still in it
  function useDifferentEmail() {
    clearSignupProgress();
    setSent(null);
  }

  // The sign-up is gone on the server (expired, or too many codes asked for): back to the form, with the reason
  function restart(message) {
    clearSignupProgress();
    setServerError(message);
    setHasAccount(false);
    setSent(null);
  }

  return (
    <AuthLayout
      title="Start with ₹1,00,000 of virtual cash."
      intro="Create an account and practise trading Indian stocks. No real money, no real risk."
      points={SIGNUP_POINTS}
    >
      <Card padding="lg">
        {sent ? (
          <CodeStep
            email={sent.email}
            cooldownSeconds={sent.cooldownSeconds}
            expiresInMinutes={sent.expiresInMinutes}
            onUseDifferentEmail={useDifferentEmail}
            onRestart={restart}
          />
        ) : (
          <>
            <h2 className="auth-layout__heading">Create your account</h2>
            <p className="auth-layout__subheading">Step 1 of 2. It takes about a minute.</p>

            {serverError && (
              <AuthMessage variant="error">
                {serverError}
                {hasAccount && (
                  <>
                    {" "}
                    <Link to="/login">Log in instead</Link>
                  </>
                )}
              </AuthMessage>
            )}

            <form className="auth-layout__form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Full Name"
                    name={field.name}
                    placeholder="Enter your full name"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={() => runAfterPointerRelease(field.onBlur)}
                    ref={field.ref}
                    error={errors.name?.message}
                    autoComplete="name"
                    animateMessage
                    required
                  />
                )}
              />

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

              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Password"
                    name={field.name}
                    type="password"
                    placeholder="Create a password"
                    hint={<PasswordRuleHint met={typedPassword.length >= 8} />}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={() => runAfterPointerRelease(field.onBlur)}
                    ref={field.ref}
                    error={errors.password?.message}
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
                    label="Confirm password"
                    name={field.name}
                    type="password"
                    placeholder="Re-enter your password"
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

              {/* The agreement: Create account stays off until this is ticked */}
              <Controller
                name="acceptedTerms"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label="I understand TradeOS uses virtual money and simulated prices. It is not real trading and not investment advice."
                    name={field.name}
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    onBlur={() => runAfterPointerRelease(field.onBlur)}
                    ref={field.ref}
                    error={errors.acceptedTerms?.message}
                    animateMessage
                    required
                  />
                )}
              />

              <Button type="submit" block loading={isSubmitting} disabled={!acceptedTerms}>
                {isSubmitting ? "Sending your code..." : "Create account"}
              </Button>
            </form>

            <p className="auth-layout__switch">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </>
        )}
      </Card>
    </AuthLayout>
  );
}
