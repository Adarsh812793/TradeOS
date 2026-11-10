import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import AuthLayout from "../features/auth/components/AuthLayout.jsx";
import AuthMessage from "../features/auth/components/AuthMessage.jsx";
import PasswordRuleHint from "../features/auth/components/PasswordRuleHint.jsx";
import signupSchema from "../features/auth/signup.validation.schema.js";
import authApi from "../features/auth/auth.api.js";
import useAutoFocusField from "../features/auth/useAutoFocusField.js";
import runAfterPointerRelease from "../features/auth/runAfterPointerRelease.js";

// What the brand side says about the account: the three facts a new user should know before signing up
const SIGNUP_POINTS = [
  "A virtual wallet of ₹1,00,000",
  "Buy and sell on weekdays, 9:15 AM to 3:30 PM IST",
  "Stock prices are simulated by TradeOS",
];

// The sign-up page: the shared auth frame around the registration form.
export default function SignupPage() {
  const navigate = useNavigate();

  const [serverError, setServerError] = useState(""); // an error message received from the backend
  const [successMessage, setSuccessMessage] = useState(""); // the backend's success message

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
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useAutoFocusField(setFocus, "name"); // the cursor starts in the first field (on devices with a mouse)

  // The password as it is typed, so the hint under it can tick when the rule is met
  const typedPassword = useWatch({ control, name: "password" });

  // Creates the account with the form values and then opens the login page (which says it worked), or shows the error.
  async function onSubmit(data) {
    setServerError("");
    setSuccessMessage("");

    try {
      // confirmPassword is only for the form check; the API needs just these three
      const { name, email, password } = data;

      const response = await authApi.register({ name, email, password });

      setSuccessMessage(response.message || "User registered successfully");

      // Redirect to Login after briefly displaying success.
      navigate("/login", {
        state: { registrationSuccess: true },
      });
    } catch (error) {
      setServerError(error.message || "Registration failed. Please try again.");
    }
  }

  return (
    <AuthLayout
      title="Start with ₹1,00,000 of virtual cash."
      intro="Create an account and practise trading Indian stocks. No real money, no real risk."
      points={SIGNUP_POINTS}
    >
      <Card padding="lg">
        <h2 className="auth-layout__heading">Create your account</h2>
        <p className="auth-layout__subheading">It takes about a minute.</p>

        {serverError && <AuthMessage variant="error">{serverError}</AuthMessage>}

        {successMessage && <AuthMessage variant="success">{successMessage}</AuthMessage>}

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

          <Button type="submit" block loading={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="auth-layout__switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
