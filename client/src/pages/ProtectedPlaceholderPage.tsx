import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedPlaceholderPage() {
  const { profile } = useAuth();
  const location = useLocation();

  return (
    <section className="welcome-panel compact-panel">
      <p className="eyebrow">FIELD LOG · IN PROGRESS</p>
      <h1>Your next entry starts here.</h1>
      <p className="welcome-copy">
        This section is being prepared. Your account is ready for the next phase.
      </p>
      <Link
        className="button button-primary"
        to={profile ? "/dashboard" : "/onboarding"}
        state={{ from: location }}
      >
        {profile ? "Go to dashboard" : "Complete your profile"}
      </Link>
    </section>
  );
}
