import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import AuthLayout from "../features/auth/components/AuthLayout.jsx";
import AuthMessage from "../features/auth/components/AuthMessage.jsx";
import { loginSchema } from "../features/auth/login.validation.schema.js";
import useAuth from "../features/auth/useAuth.js";
import useAutoFocusField from "../features/auth/useAutoFocusField.js";
import { IDLE_LIMIT_MINUTES } from "../features/auth/idleActivity.js";

// The login page: the shared auth frame around the sign-in form, plus the notices other flows send here
// (just registered, account deleted, signed out after inactivity).
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [serverError, setServerError] = useState("");

  // Notices passed in through the navigation state by the flows that send the user here
  const registrationSuccess = location.state?.registrationSuccess;
  const accountDeleted = location.state?.accountDeleted; // set after deleting the account from the Account page
  const sessionEndReason = location.state?.sessionEndReason; // "idle" or "expired": set when the app signed the user out

  const {
    control,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({
    // "onTouched": a field is checked when the visitor leaves it (and then on every change), not only on submit
    mode: "onTouched",
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useAutoFocusField(setFocus, "email"); // the cursor starts in the email field (on devices with a mouse)

  // Signs the user in with the form values and opens the dashboard, or shows the server's error message.
  async function onSubmit(credentials) {
    setServerError("");

    try {
      await login(credentials);

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      setServerError(error.message || "Login failed. Please try again.");
    }
  }

  return (
    <AuthLayout
      title="Pick up where you left off."
      intro="Your portfolio, orders and watchlist are as you left them."
    >
      <Card padding="lg">
        <h2 className="auth-layout__heading">Log in</h2>
        <p className="auth-layout__subheading">Use your TradeOS account.</p>

        {registrationSuccess && <AuthMessage variant="success">Account created successfully. Please sign in.</AuthMessage>}

        {accountDeleted && (
          <AuthMessage variant="info">Your account has been deleted. We&apos;re sorry to see you go.</AuthMessage>
        )}

        {sessionEndReason && (
          <AuthMessage variant="info">
            {sessionEndReason === "idle"
              ? `You were signed out after ${IDLE_LIMIT_MINUTES} minutes of inactivity. Please sign in again.`
              : "Your session has expired. Please sign in again."}
          </AuthMessage>
        )}

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
                onBlur={field.onBlur}
                ref={field.ref}
                error={errors.email?.message}
                autoComplete="email"
                reserveErrorSpace
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
                placeholder="Enter your password"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                error={errors.password?.message}
                autoComplete="current-password"
                reserveErrorSpace
                required
              />
            )}
          />

          <Button type="submit" block loading={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Log in"}
          </Button>
        </form>

        <p className="auth-layout__switch">
          Don&apos;t have an account? <Link to="/signup">Create an account</Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
