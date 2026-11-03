import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import GuestButton from "../components/GuestButton";
import { useAuth } from "../context/AuthContext";
import { api, isApiError } from "../lib/api";

export function SignupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Those passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await api.signup(email.trim(), password);
      await login(email.trim(), password);
      navigate("/onboarding", { replace: true });
    } catch (requestError) {
      setError(
        isApiError(requestError)
          ? requestError.message
          : "We could not create your account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-card">
      <p className="eyebrow">START YOUR FIELD LOG</p>
      <h1>Make room for progress.</h1>
      <p className="auth-description">Your training log starts with the first rep.</p>
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
          <span>Password <span className="field-hint">At least 8 characters</span></span>
          <input
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input
            autoComplete="new-password"
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button
          className="button button-primary button-full"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Creating your account…" : "Create account"}
        </button>
      </form>
      <GuestButton />
      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  );
}
