import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { user, profile, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <main className="auth-loading" aria-live="polite">
        Restoring your field log…
      </main>
    );
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (!profile && location.pathname !== "/onboarding") {
    return <Navigate replace to="/onboarding" />;
  }

  if (profile && location.pathname === "/onboarding") {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}
