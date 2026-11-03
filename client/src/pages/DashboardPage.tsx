import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import {
  api,
  isApiError,
  type ActiveWorkoutPlan,
  type CaloriesTrendPoint,
  type MealLogSummary,
  type WeightTrendPoint,
  type WorkoutSessionSummary,
} from "../lib/api";

interface DashboardData {
  plan: ActiveWorkoutPlan | null;
  calories: CaloriesTrendPoint[];
  weights: WeightTrendPoint[];
  sessions: WorkoutSessionSummary[];
  meals: MealLogSummary;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function shortDate(value: unknown) {
  return typeof value === "string" ? value.slice(5, 10) : String(value);
}

export function DashboardPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [plan, calories, weights, sessions, meals] = await Promise.all([
        api.getActiveWorkoutPlan(),
        api.getCaloriesTrend(),
        api.getWeightTrend(),
        api.getWorkoutSessions(),
        api.getMealsForDate(todayString()),
      ]);
      setData({ plan, calories, weights, sessions, meals });
    } catch (requestError) {
      setError(
        isApiError(requestError)
          ? requestError.message
          : "We could not load your dashboard. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <section className="dashboard-state" aria-live="polite">
        <p className="eyebrow">YOUR FIELD LOG</p>
        <h1>Loading your dashboard…</h1>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="dashboard-state">
        <p className="eyebrow">YOUR FIELD LOG</p>
        <h1>Your dashboard could not load.</h1>
        <p className="form-error" role="alert">{error || "No dashboard data was returned."}</p>
        <button
          className="button button-primary"
          onClick={() => void loadDashboard()}
          type="button"
        >
          Try again
        </button>
      </section>
    );
  }

  const weekdayIndex = (new Date().getDay() + 6) % 7;
  const todayPlanDay = data.plan?.planJson.days.find(
    (day) => day.dayIndex === weekdayIndex,
  );
  const todayExercises =
    data.plan?.planJson.exercises.filter(
      (exercise) => exercise.dayIndex === weekdayIndex,
    ) ?? [];
  const recentSessions = data.sessions.slice(0, 3);
  const firstRecentCaloriesDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const recentCalories = data.calories.filter(
    (entry) => entry.date >= firstRecentCaloriesDate,
  );

  return (
    <div className="dashboard">
      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">YOUR FIELD LOG · DASHBOARD</p>
          <h1>Good work, {profile?.displayName || "athlete"}.</h1>
          <p className="dashboard-lede">
            A clear view of your training, nutrition, and progress.
          </p>
        </div>
        <button
          className="button button-secondary"
          onClick={() => void loadDashboard()}
          type="button"
        >
          Refresh
        </button>
      </section>

      <section aria-label="Today's summary" className="dashboard-metrics">
        <article className="dashboard-card">
          <span className="dashboard-card-label">Calories today</span>
          <strong>{Math.round(data.meals.totals.calories).toLocaleString()}</strong>
          <span className="dashboard-card-unit">kcal logged</span>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card-label">Protein today</span>
          <strong>{Math.round(data.meals.totals.protein)} g</strong>
          <span className="dashboard-card-unit">from meal entries</span>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card-label">Completed sessions</span>
          <strong>{data.sessions.length}</strong>
          <span className="dashboard-card-unit">training entries</span>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card-label">Latest weight</span>
          <strong>
            {data.weights.length
              ? `${data.weights[data.weights.length - 1].weightKg.toFixed(1)} kg`
              : "—"}
          </strong>
          <span className="dashboard-card-unit">most recent entry</span>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">TRAINING</p>
              <h2>{todayPlanDay?.label ?? "Your plan"}</h2>
            </div>
          </div>
          {todayPlanDay?.isRestDay ? (
            <p className="dashboard-muted">Today is a scheduled rest day.</p>
          ) : todayExercises.length > 0 ? (
            <ul className="dashboard-exercise-list">
              {todayExercises.map((exercise) => (
                <li key={`${exercise.dayIndex}-${exercise.orderIndex}`}>
                  <span>{exercise.name}</span>
                  <span>
                    {exercise.targetSets} × {exercise.targetRepsMin}–
                    {exercise.targetRepsMax}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-muted">
              {data.plan
                ? "No exercises are scheduled for today."
                : "There is no active workout plan yet."}
            </p>
          )}
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">NUTRITION</p>
              <h2>Today’s meals</h2>
            </div>
          </div>
          {data.meals.mealLogs.length > 0 ? (
            <ul className="dashboard-meal-list">
              {data.meals.mealLogs.map((meal) => (
                <li key={meal.id}>
                  <span className="dashboard-meal-slot">{meal.mealSlot}</span>
                  <span>
                    {meal.items.length
                      ? meal.items.map((item) => item.foodName).join(", ")
                      : "No catalog food available for this entry"}
                  </span>
                  <span>
                    {Math.round(
                      meal.items.reduce((sum, item) => sum + item.calories, 0),
                    )}{" "}
                    kcal
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-muted">No meals logged for today.</p>
          )}
        </article>

        <article className="dashboard-panel dashboard-chart-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">NUTRITION · 7 DAYS</p>
              <h2>Calories logged</h2>
            </div>
          </div>
          <div className="dashboard-chart">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={recentCalories}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text)",
                    background: "var(--surface)",
                  }}
                  labelFormatter={shortDate}
                />
                <Bar dataKey="calories" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="dashboard-panel dashboard-chart-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">PROGRESS · {data.weights.length} ENTRIES</p>
              <h2>Weight trend</h2>
            </div>
          </div>
          <div className="dashboard-chart">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart
                data={data.weights.map((entry) => ({
                  ...entry,
                  date: entry.recordedAt.slice(0, 10),
                }))}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text)",
                    background: "var(--surface)",
                  }}
                  labelFormatter={shortDate}
                />
                <Line
                  dataKey="weightKg"
                  dot={{ fill: "var(--accent)" }}
                  stroke="var(--accent)"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">RECENT WORK</p>
              <h2>Training sessions</h2>
            </div>
          </div>
          {recentSessions.length > 0 ? (
            <ul className="dashboard-session-list">
              {recentSessions.map((session) => (
                <li key={session.id}>
                  <span>
                    {session.completedAt
                      ? new Date(session.completedAt).toLocaleDateString()
                      : "In progress"}
                  </span>
                  <span>
                    {new Set(session.sets.map((set) => set.exerciseId)).size}{" "}
                    exercises · {session.sets.length} sets
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-muted">No completed sessions yet.</p>
          )}
        </article>
      </section>
    </div>
  );
}
