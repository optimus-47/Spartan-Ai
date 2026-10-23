import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isApiError } from "../lib/api";

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { user, profile, ready, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (ready && user) {
    return <Navigate replace to={profile ? "/dashboard" : "/onboarding"} />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const currentUser = await login(email.trim(), password);
      const state = location.state as LocationState | null;
      const destination = currentUser.profile
        ? state?.from?.pathname ?? "/dashboard"
        : "/onboarding";
      navigate(destination, { replace: true });
    } catch (requestError) {
      if (isApiError(requestError) && requestError.code === "EMAIL_NOT_VERIFIED") {
        setError("Verify your email from the link in your inbox, then return here.");
      } else {
        setError(
          isApiError(requestError)
            ? requestError.message
            : "We could not sign you in. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-card">
      <p className="eyebrow">WELCOME BACK</p>
      <h1>Return to your log.</h1>
      <p className="auth-description">A steady practice starts with showing up.</p>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email</span>
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button
          className="button button-primary button-full"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="auth-switch">
        New to Spartan AI? <Link to="/signup">Create an account</Link>
      </p>
    </section>
  );
}
