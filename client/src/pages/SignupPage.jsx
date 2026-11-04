
import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { ChartNoAxesCombinedIcon } from "lucide-react";
import "./SignupPage.css";

//Using zod for client side validation
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import signupSchema from "../features/auth/signup.validation.schema.js";

//Connecting to backend endpoint
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authApi from "../features/auth/auth.api.js";

export default function SignupPage() {

    //i. State variables are managed by zod internally -No need to create our own state variables
    const navigate = useNavigate();

    const [serverError, setServerError] = useState(""); //Stores err msg recieved from backend
    const [successMessage, setSuccessMessage] = useState(""); //Stores succes msg

    //ii. Functions

    const {control,handleSubmit,formState: { errors, isSubmitting },} = useForm({
      resolver: zodResolver(signupSchema),
      defaultValues: {
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      },
    });
    
    //Function that handles things after submission
    async function onSubmit(data) {
      setServerError("");
      setSuccessMessage("");

      try {
        // confirmPassword is only for the form check; the API needs just these three
        const { name, email, password } = data;

        const response = await authApi.register({ name, email, password });

        setSuccessMessage(
          response.message || "User registered successfully"
        );

        console.log("Registered user:", response.data);

        // Redirect to Login after briefly displaying success.
        navigate("/login", {
          state: { registrationSuccess: true },
        });

      } catch (error) {
        setServerError(
          error.message || "Registration failed. Please try again."
        );
      }
    }

  return (
    <main className="signup-page">

    {/*I. Shared decorative chart spanning both panels */}
      <div className="signup-page__chart" aria-hidden="true">
        <svg
          viewBox="0 0 1000 300"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
            </linearGradient>

            {/* Fade the chart as it approaches the form */}
            <linearGradient id="chartFade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="65%" stopColor="white" stopOpacity="0.9" />
              <stop offset="100%" stopColor="white" stopOpacity="0.2" />
            </linearGradient>

            <mask id="chartMask">
              <rect width="1000" height="300" fill="url(#chartFade)" />
            </mask>
          </defs>

          <g mask="url(#chartMask)">
            {/* Filled area under the line */}
            <path
              d="M0 250 L100 210 L170 230 L260 150 L340 180
                 L420 110 L500 145 L590 75 L670 115
                 L760 45 L840 80 L920 25 L1000 55
                 L1000 300 L0 300 Z"
              fill="url(#chartArea)"
            />

            {/* Continuous market line */}
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


      {/*II. Left panel: TradeOS branding and product benefits */}
      <section className="signup-page__brand">

        {/* i.Logo in left panel */}
        <a href="/login" className="signup-page__logo">
        <span className="signup-page__logo-mark" aria-hidden="true">
            <ChartNoAxesCombinedIcon size={24}></ChartNoAxesCombinedIcon>
        </span>
        <span>TradeOS</span>
        </a>

        {/* ii.Intro in left panel */}
        <div className="signup-page__intro">
          <h1>Start your trading journey today.</h1>
          <p>
            Create your account and explore the stock market
            with virtual trading.
          </p>
        </div>

        {/* iii.Features in left panel */}
        <ul className="signup-page__features">
          <li>Real market data</li>
          <li>Virtual trading</li>
          <li>Track your performance</li>
        </ul>

      </section>

      {/*III. Right panel: Signup form */}
      <section className="signup-page__form-section">
        <Card padding="lg">

          <div className="signup-page__form-header">
            <h2>Create your account</h2>
            <p>It's free and only takes a minute.</p>
          </div>

            {serverError && (
              <p className="signup-page__error" role="alert">
                {serverError}
              </p>
            )}

            {successMessage && (
              <p className="signup-page__success" role="status">
                {successMessage}
              </p>
            )}

          <form className="signup-page__form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Form fields — behavior comes later */}

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
                  error={errors.name?.message}
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
                    error={errors.email?.message}
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
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.password?.message}
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
                    error={errors.confirmPassword?.message}
                    required
                  />
                )}
              />


              <Button type="submit" block disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create Account"}
              </Button>
              
          </form>

          <p className="signup-page__login-link">
            Already have an account? <a href="/login">Log in</a>
          </p>
        </Card>
      </section>
    </main>
  );
}
