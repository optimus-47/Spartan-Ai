import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, isApiError } from "../lib/api";

export function ProtectedPlaceholderPage() {
  const { profile } = useAuth();
  const location = useLocation();
  const planNotice =
    (location.state as { planNotice?: string } | null)?.planNotice ?? "";
  const [planError, setPlanError] = useState("");
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planReady, setPlanReady] = useState(false);

  const handleGeneratePlan = async () => {
    setGeneratingPlan(true);
    setPlanError("");
    try {
      await api.generateWorkoutPlan("upper_lower");
      setPlanReady(true);
    } catch (requestError) {
      setPlanError(
        isApiError(requestError)
          ? requestError.message
          : "We could not generate your plan. Please try again.",
      );
    } finally {
      setGeneratingPlan(false);
    }
  };

  return (
    <section className="welcome-panel compact-panel">
      <p className="eyebrow">FIELD LOG · IN PROGRESS</p>
      <h1>Your next entry starts here.</h1>
      <p className="welcome-copy">
        This section is being prepared. Your account is ready for the next phase.
      </p>
      {location.pathname === "/dashboard" && planNotice && (
        <div className="plan-notice" role="status">
          <p>{planReady ? "Your plan is ready." : planNotice}</p>
          {planError && <p className="form-error" role="alert">{planError}</p>}
          {!planReady && (
            <button
              className="button button-primary"
              disabled={generatingPlan}
              onClick={() => void handleGeneratePlan()}
              type="button"
            >
              {generatingPlan ? "Generating plan..." : "Generate plan"}
            </button>
          )}
        </div>
      )}
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
