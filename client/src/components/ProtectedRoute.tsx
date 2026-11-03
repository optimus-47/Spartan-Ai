import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { user, ready, status } = useAuth();
  const location = useLocation();

  if (
    !ready ||
    status === "restoring" ||
    status === "signed-in-profile-loading"
  ) {
    return (
      <main className="auth-loading" aria-live="polite">
        Restoring your field log…
      </main>
    );
  }

  if (status === "signed-out" || !user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (
    status === "signed-in-without-profile" &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate replace to="/onboarding" />;
  }

  if (
    status === "signed-in-with-profile" &&
    location.pathname === "/onboarding"
  ) {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}
