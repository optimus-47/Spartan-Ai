import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function HomePage() {
  const { user, profile, ready } = useAuth();

  if (!ready) return <main className="auth-loading">Opening your field log…</main>;
  if (user) return <Navigate replace to={profile ? "/dashboard" : "/onboarding"} />;

  return (
    <section className="welcome-panel">
      <p className="eyebrow">ENTRY · VOL. I</p>
      <h1>Training, kept in good order.</h1>
      <p className="welcome-copy">
        A considered place for your training and nutrition. Built around the work
        you put in.
      </p>
      <div className="welcome-actions">
        <Link className="button button-primary" to="/signup">Create your account</Link>
        <Link className="button button-secondary" to="/login">Log in</Link>
      </div>
    </section>
  );
}
