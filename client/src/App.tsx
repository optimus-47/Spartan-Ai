import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ProtectedPlaceholderPage } from "./pages/ProtectedPlaceholderPage";
import { SignupPage } from "./pages/SignupPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";

function RootRoute() {
  const { user, profile, ready } = useAuth();
  if (!ready) return <main className="auth-loading">Opening your field log…</main>;
  if (user) return <Navigate replace to={profile ? "/dashboard" : "/onboarding"} />;
  return <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<RootRoute />} path="/" />
      <Route element={<AppShell />}>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<SignupPage />} path="/signup" />
        <Route element={<VerifyEmailPage />} path="/verify-email" />
        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedPlaceholderPage />} path="/onboarding" />
          <Route element={<ProtectedPlaceholderPage />} path="/dashboard" />
          <Route element={<ProtectedPlaceholderPage />} path="/workouts" />
          <Route
            element={<ProtectedPlaceholderPage />}
            path="/workouts/session/:sessionId"
          />
          <Route element={<ProtectedPlaceholderPage />} path="/workouts/history" />
          <Route element={<ProtectedPlaceholderPage />} path="/nutrition" />
          <Route element={<ProtectedPlaceholderPage />} path="/nutrition/add" />
          <Route element={<ProtectedPlaceholderPage />} path="/nutrition/scan" />
          <Route
            element={<ProtectedPlaceholderPage />}
            path="/nutrition/meal-plan"
          />
          <Route element={<ProtectedPlaceholderPage />} path="/progress" />
          <Route element={<ProtectedPlaceholderPage />} path="/profile" />
        </Route>
        <Route element={<HomePage />} path="*" />
      </Route>
    </Routes>
  );
}
