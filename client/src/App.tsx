import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import { DashboardPage } from "./pages/DashboardPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProgressPage } from "./pages/ProgressPage";
import { MealPlannerPage } from "./pages/MealPlannerPage";
import { NutritionPage } from "./pages/NutritionPage";
import { SignupPage } from "./pages/SignupPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { WorkoutSessionPage } from "./pages/WorkoutSessionPage";
import { WorkoutsPage } from "./pages/WorkoutsPage";

function RootRoute() {
  const { user, profile, ready, status } = useAuth();
  if (!ready || status === "restoring" || status === "signed-in-profile-loading") {
    return <main className="auth-loading">Opening your field log…</main>;
  }
  if (user) return <Navigate replace to={profile ? "/dashboard" : "/onboarding"} />;
  return <Landing />;
}

export default function App() {
  const { error, refresh, status } = useAuth();

  if (status === "restore-error") {
    return (
      <main className="auth-retry" aria-live="polite">
        <section className="auth-card">
          <p className="eyebrow">CONNECTION INTERRUPTED</p>
          <h1>We could not restore your field log.</h1>
          <p className="auth-description">
            {error || "Connection problem. Check your internet and retry."}
          </p>
          <button
            className="button button-primary button-full"
            onClick={() => void refresh()}
            type="button"
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <Routes>
      <Route element={<RootRoute />} path="/" />
      <Route element={<AppShell />}>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<SignupPage />} path="/signup" />
        <Route element={<VerifyEmailPage />} path="/verify-email" />
        <Route element={<ProtectedRoute />}>
          <Route element={<OnboardingPage />} path="/onboarding" />
          <Route element={<DashboardPage />} path="/dashboard" />
          <Route element={<WorkoutsPage />} path="/workouts" />
          <Route element={<WorkoutSessionPage />} path="/workouts/session/:sessionId" />
          <Route element={<WorkoutsPage focusHistory />} path="/workouts/history" />
          <Route element={<NutritionPage />} path="/nutrition" />
          <Route element={<NutritionPage initialPanel="add" />} path="/nutrition/add" />
          <Route element={<NutritionPage initialPanel="scan" />} path="/nutrition/scan" />
          <Route element={<MealPlannerPage />} path="/nutrition/meal-plan" />
          <Route element={<ProgressPage />} path="/progress" />
          <Route element={<ProfilePage />} path="/profile" />
        </Route>
        <Route element={<HomePage />} path="*" />
      </Route>
    </Routes>
  );
}
