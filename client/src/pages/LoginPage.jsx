
import { Link } from "react-router-dom";
import { ChartNoAxesCombinedIcon } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import "./LoginPage.css";

import { useForm, Controller } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../features/auth/login.validation.schema.js";

import { useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import useAuth from "../features/auth/useAuth.js";
import { IDLE_LIMIT_MINUTES } from "../features/auth/idleActivity.js";

export default function LoginPage() {

  //i.state variables and other variables
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [serverError, setServerError] = useState("");
  const registrationSuccess = location.state?.registrationSuccess;
  const accountDeleted = location.state?.accountDeleted; // set after deleting the account from the Account page
  const sessionEndReason = location.state?.sessionEndReason; // "idle" or "expired": set when the app signed the user out


    const {control,handleSubmit,formState: { errors, isSubmitting },} = useForm({
      resolver:zodResolver(loginSchema),
      defaultValues: {
        email: "",
        password: "",
      },
    });

    async function onSubmit(credentials) {
      setServerError("");

      try {
        await login(credentials);

        navigate("/dashboard", {
          replace: true,
        });
      } catch (error) {
        setServerError(
          error.message || "Login failed. Please try again."
        );
      }
    }

  return (
    <main className="login-page">

      {/* 1. Shared decorative market chart */}
      <div className="login-page__chart" aria-hidden="true">
        <svg
          viewBox="0 0 1000 300"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="loginChartArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="loginChartFade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="65%" stopColor="white" stopOpacity="0.9" />
              <stop offset="100%" stopColor="white" stopOpacity="0.2" />
            </linearGradient>

            <mask id="loginChartMask">
              <rect width="1000" height="300" fill="url(#loginChartFade)" />
            </mask>
          </defs>

          <g mask="url(#loginChartMask)">
            <path
              d="M0 250 L100 210 L170 230 L260 150 L340 180
                 L420 110 L500 145 L590 75 L670 115
                 L760 45 L840 80 L920 25 L1000 55
                 L1000 300 L0 300 Z"
              fill="url(#loginChartArea)"
            />

            <path
              d="M0 250 L100 210 L170 230 L260 150 L340 180
                 L420 110 L500 145 L590 75 L670 115
                 L760 45 L840 80 L920 25 L1000 55"
              fill="none"
              stroke="#16A34A"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>

      {/* 2. Left panel: Branding and product benefits */}
      <section className="login-page__brand">

        {/* 2.1 Logo */}
        <Link to="/login" className="login-page__logo">
          <span className="login-page__logo-mark" aria-hidden="true">
            <ChartNoAxesCombinedIcon size={24} />
          </span>
          <span>TradeOS</span>
        </Link>

        {/* 2.2 Introduction */}
        <div className="login-page__intro">
          <h1>Your trading journey continues here.</h1>
          <p>
            Sign in to explore the markets, manage your virtual portfolio,
            and track your trading performance.
          </p>
        </div>

        {/* 2.3 Product benefits */}
        <ul className="login-page__features">
          <li>Explore market data</li>
          <li>Practice with virtual money</li>
          <li>Track your portfolio performance</li>
        </ul>
      </section>

      {/* 3. Right panel: Login form */}
      <section className="login-page__form-section">
        <Card padding="lg">
          <div className="login-page__form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your TradeOS account.</p>
          </div>

          {registrationSuccess && (
            <p className="login-page__success" role="status">
              Account created successfully. Please sign in.
            </p>
          )}

          {accountDeleted && (
            <p className="login-page__success" role="status">
              Your account has been deleted. We're sorry to see you go.
            </p>
          )}

          {sessionEndReason && (
            <p className="login-page__notice" role="status">
              {sessionEndReason === "idle"
                ? `You were signed out after ${IDLE_LIMIT_MINUTES} minutes of inactivity. Please sign in again.`
                : "Your session has expired. Please sign in again."}
            </p>
          )}

          {serverError && (
            <p className="login-page__error" role="alert">
              {serverError}
            </p>
          )}

          <form className="login-page__form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* 3.1 Email */}
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
                  error={errors.email?.message}
                  autoComplete="email"
                  required
                />
              )}
            />

            {/* 3.2 Password and recovery link */}
            <div className="login-page__password-section">

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
                    error={errors.password?.message}
                    autoComplete="current-password"
                    required
                  />
                )}
              />

              <div className="login-page__forgot-link">
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            </div>

            {/* 3.3 Submit */}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Loging in..." : "Login"}
            </Button>
            
          </form>

          {/* 3.4 Signup navigation */}
          <p className="login-page__signup-link">
            Don't have an account? <Link to="/signup">Create an account</Link>
          </p>
        </Card>
      </section>
    </main>
  );
}
