import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NavIcon } from "../components/AppNav";
import {
  chartTick,
  chartTooltipStyle,
  EmptyState,
  ErrorState,
  LoadingState,
  MacroBar,
  Panel,
  ProgressRing,
  StatCard,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import {
  api,
  isApiError,
  type ActiveWorkoutPlan,
  type AiMealPlan,
  type CaloriesTrendPoint,
  type MealLogSummary,
  type WeightTrendPoint,
  type WorkoutSessionSummary,
} from "../lib/api";
import {
  activityStreak,
  computeTargets,
  DAY_MS,
  dateKey,
  daysAgoKey,
  formatNumber,
  GOAL_LABELS,
  greeting,
  MEAL_SLOTS,
  personalRecords,
  sessionVolume,
  shortDate,
  titleCase,
  WEEKDAY_LABELS,
  weekdayIndex,
} from "../lib/fitness";

interface DashboardData {
  plan: ActiveWorkoutPlan | null;
  calories: CaloriesTrendPoint[];
  weights: WeightTrendPoint[];
  sessions: WorkoutSessionSummary[];
  meals: MealLogSummary;
  mealPlan: AiMealPlan | null;
}

interface Insight {
  icon: string;
  title: string;
  body: string;
  tone: "good" | "warn" | "info";
}

function startOfWeek(): Date {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - weekdayIndex(now));
  return start;
}

export function DashboardPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [plan, calories, weights, sessions, meals, mealPlan] = await Promise.all([
        api.getActiveWorkoutPlan(),
        api.getCaloriesTrend(),
        api.getWeightTrend(),
        api.getWorkoutSessions(),
        api.getMealsForDate(dateKey()),
        api.getLatestMealPlan().catch(() => null),
      ]);
      setData({ plan, calories, weights, sessions, meals, mealPlan });
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

  const targets = useMemo(() => computeTargets(profile), [profile]);

  const derived = useMemo(() => {
    if (!data) return null;
    const completed = data.sessions.filter((session) => session.completedAt);
    const weekStart = startOfWeek().getTime();
    const lastWeekStart = weekStart - 7 * DAY_MS;
    const thisWeek = completed.filter(
      (session) => new Date(session.completedAt as string).getTime() >= weekStart,
    );
    const lastWeek = completed.filter((session) => {
      const time = new Date(session.completedAt as string).getTime();
      return time >= lastWeekStart && time < weekStart;
    });
    const thisWeekVolume = thisWeek.reduce((sum, s) => sum + sessionVolume(s.sets), 0);
    const lastWeekVolume = lastWeek.reduce((sum, s) => sum + sessionVolume(s.sets), 0);
    const trainedWeekdays = new Set(
      thisWeek.map((session) => weekdayIndex(new Date(session.completedAt as string))),
    );

    const activeDates = new Set<string>([
      ...completed.map((session) => dateKey(new Date(session.completedAt as string))),
      ...data.calories.filter((entry) => entry.calories > 0).map((entry) => entry.date),
    ]);
    const streak = activityStreak(activeDates);

    const caloriesByDate = new Map(data.calories.map((entry) => [entry.date, entry.calories]));
    const last14 = Array.from({ length: 14 }, (_, index) => {
      const date = daysAgoKey(13 - index);
      return { date, calories: Math.round(caloriesByDate.get(date) ?? 0) };
    });
    const loggedDays = last14.filter((entry) => entry.calories > 0);
    const averageCalories = loggedDays.length
      ? loggedDays.reduce((sum, entry) => sum + entry.calories, 0) / loggedDays.length
      : 0;

    const weights = data.weights.map((entry) => ({
      date: entry.recordedAt.slice(0, 10),
      weightKg: Number(entry.weightKg.toFixed(1)),
    }));
    const latestWeight = weights.at(-1)?.weightKg ?? profile?.weightKg ?? null;
    const firstWeight = weights[0]?.weightKg ?? null;
    const weightChange =
      latestWeight !== null && firstWeight !== null && weights.length > 1
        ? latestWeight - firstWeight
        : null;

    const records = personalRecords(completed).slice(0, 4);
    const recentPrSets = completed
      .slice(0, 3)
      .reduce((sum, session) => sum + session.sets.filter((set) => set.isPr).length, 0);

    return {
      completed,
      thisWeek,
      thisWeekVolume,
      lastWeekVolume,
      trainedWeekdays,
      streak,
      last14,
      averageCalories,
      weights,
      latestWeight,
      weightChange,
      records,
      recentPrSets,
    };
  }, [data, profile?.weightKg]);

  if (loading) return <LoadingState label="Loading your dashboard" />;

  if (error || !data || !derived) {
    return (
      <ErrorState
        message={error || "No dashboard data was returned."}
        onRetry={() => void loadDashboard()}
        title="Your dashboard could not load."
      />
    );
  }

  const today = weekdayIndex();
  const todayPlanDay = data.plan?.planJson.days.find((day) => day.dayIndex === today);
  const todayExercises =
    data.plan?.planJson.exercises
      .filter((exercise) => exercise.dayIndex === today)
      .sort((a, b) => a.orderIndex - b.orderIndex) ?? [];
  const trainedToday = derived.completed.some(
    (session) => dateKey(new Date(session.completedAt as string)) === dateKey(),
  );
  const caloriesToday = data.meals.totals.calories;
  const caloriesLeft = targets.calories - caloriesToday;
  const volumeTrend =
    derived.lastWeekVolume > 0
      ? ((derived.thisWeekVolume - derived.lastWeekVolume) / derived.lastWeekVolume) * 100
      : null;
  const plannedTrainingDays =
    data.plan?.planJson.days.filter((day) => !day.isRestDay).length ?? 0;
  const mealPlanToday = data.mealPlan?.generatedPlan.days.length
    ? data.mealPlan.generatedPlan.days[today % data.mealPlan.generatedPlan.days.length]
    : null;

  const insights: Insight[] = [];
  const proteinRatio = data.meals.totals.protein / Math.max(targets.protein, 1);
  if (proteinRatio < 0.6) {
    insights.push({
      icon: "🥚",
      title: "Protein is behind",
      body: `${Math.round(targets.protein - data.meals.totals.protein)} g to go today. Add a high-protein snack like curd, eggs or whey.`,
      tone: "warn",
    });
  } else {
    insights.push({
      icon: "💪",
      title: "Protein on track",
      body: `You've hit ${Math.round(proteinRatio * 100)}% of your ${targets.protein} g target.`,
      tone: "good",
    });
  }
  if (derived.thisWeek.length >= Math.max(plannedTrainingDays - 1, 2)) {
    insights.push({
      icon: "🔥",
      title: "Strong training week",
      body: `${derived.thisWeek.length} sessions logged this week. Keep the momentum and prioritise sleep.`,
      tone: "good",
    });
  } else if (todayPlanDay && !todayPlanDay.isRestDay && !trainedToday) {
    insights.push({
      icon: "🏋️",
      title: `${todayPlanDay.label} is on deck`,
      body: `${todayExercises.length} exercises are planned today. Start a session to log your sets and catch PRs.`,
      tone: "info",
    });
  }
  if (derived.weightChange !== null) {
    const losing = derived.weightChange < 0;
    const wantsLoss = profile?.goal === "fat_loss";
    insights.push({
      icon: losing ? "📉" : "📈",
      title: `${losing ? "Down" : "Up"} ${Math.abs(derived.weightChange).toFixed(1)} kg`,
      body:
        wantsLoss === losing
          ? "Your weight trend matches your goal. Stay consistent."
          : `Trend since your first weigh-in. Your goal is ${GOAL_LABELS[profile?.goal ?? ""]?.toLowerCase() ?? "general fitness"}.`,
      tone: wantsLoss === losing ? "good" : "info",
    });
  }
  if (derived.recentPrSets > 0) {
    insights.push({
      icon: "🏆",
      title: `${derived.recentPrSets} PR sets recently`,
      body: "Progressive overload is working. Small, steady jumps beat big ones.",
      tone: "good",
    });
  }

  const startSession = async () => {
    setStarting(true);
    try {
      const session = await api.startWorkoutSession(data.plan?.id);
      navigate(`/workouts/session/${session.id}`);
    } catch (requestError) {
      setError(
        isApiError(requestError) ? requestError.message : "Could not start a session.",
      );
      setStarting(false);
    }
  };

  return (
    <div className="app-page dashboard-v2">
      <section className="hero-card">
        <div className="hero-card-glow" aria-hidden="true" />
        <div className="hero-card-copy">
          <p className="eyebrow">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            {user?.isGuest ? " · DEMO MODE" : ""}
          </p>
          <h1>
            {greeting()}, {profile?.displayName || "athlete"}.
          </h1>
          <p className="page-lede">
            {trainedToday
              ? "Session done today. Recover well and hit your nutrition targets."
              : todayPlanDay?.isRestDay
                ? "Rest day. Walk, stretch and eat to fuel tomorrow."
                : todayPlanDay
                  ? `Today is ${todayPlanDay.label}. ${todayExercises.length} exercises are waiting.`
                  : "Generate a plan to get a personalised training week."}
          </p>
          <div className="hero-chips">
            <span className="chip">
              <span aria-hidden="true">🔥</span> {derived.streak}-day streak
            </span>
            <span className="chip">
              <span aria-hidden="true">🎯</span>{" "}
              {GOAL_LABELS[profile?.goal ?? ""] ?? "General fitness"}
            </span>
            <span className="chip">
              <span aria-hidden="true">📅</span> {derived.thisWeek.length}/
              {plannedTrainingDays || "—"} sessions this week
            </span>
          </div>
        </div>
        <div className="quick-actions">
          <button
            className="quick-action quick-action-primary"
            disabled={starting}
            onClick={() => void startSession()}
            type="button"
          >
            <NavIcon name="workouts" />
            <span>{starting ? "Starting…" : "Start workout"}</span>
          </button>
          <Link className="quick-action" to="/nutrition/add">
            <NavIcon name="nutrition" />
            <span>Log a meal</span>
          </Link>
          <Link className="quick-action" to="/nutrition/scan">
            <span aria-hidden="true" className="nav-icon nav-emoji">📸</span>
            <span>AI photo scan</span>
          </Link>
          <Link className="quick-action" to="/nutrition/meal-plan">
            <NavIcon name="planner" />
            <span>AI meal plan</span>
          </Link>
        </div>
      </section>

      <section className="stat-grid" aria-label="Key stats">
        <StatCard
          hint="consecutive active days"
          icon="🔥"
          label="Streak"
          value={`${derived.streak} ${derived.streak === 1 ? "day" : "days"}`}
        />
        <StatCard
          hint={`${derived.completed.length} total sessions`}
          icon="🏋️"
          label="This week"
          value={`${derived.thisWeek.length} workouts`}
        />
        <StatCard
          hint="weekly volume"
          icon="⚡"
          label="Volume"
          trend={
            volumeTrend === null
              ? null
              : {
                  text: `${volumeTrend >= 0 ? "▲" : "▼"} ${Math.abs(volumeTrend).toFixed(0)}% vs last week`,
                  positive: volumeTrend >= 0,
                }
          }
          value={`${formatNumber(derived.thisWeekVolume / 1000, 1)} t`}
        />
        <StatCard
          hint="latest weigh-in"
          icon="⚖️"
          label="Body weight"
          trend={
            derived.weightChange === null
              ? null
              : {
                  text: `${derived.weightChange <= 0 ? "▼" : "▲"} ${Math.abs(derived.weightChange).toFixed(1)} kg`,
                  positive:
                    profile?.goal === "muscle_gain"
                      ? derived.weightChange >= 0
                      : derived.weightChange <= 0,
                }
          }
          value={derived.latestWeight ? `${derived.latestWeight.toFixed(1)} kg` : "—"}
        />
      </section>

      <section className="bento">
        <Panel
          action={
            <Link className="panel-link" to="/nutrition">
              Open log →
            </Link>
          }
          className="bento-fuel"
          eyebrow="TODAY'S FUEL"
          title="Calories & macros"
        >
          <div className="fuel-layout">
            <ProgressRing
              label={<strong>{formatNumber(caloriesToday)}</strong>}
              max={targets.calories}
              sublabel={`of ${formatNumber(targets.calories)} kcal`}
              value={caloriesToday}
            />
            <div className="fuel-macros">
              <p className="fuel-remaining">
                {caloriesLeft >= 0 ? (
                  <>
                    <strong>{formatNumber(caloriesLeft)}</strong> kcal remaining
                  </>
                ) : (
                  <>
                    <strong>{formatNumber(-caloriesLeft)}</strong> kcal over target
                  </>
                )}
              </p>
              <MacroBar
                label="Protein"
                target={targets.protein}
                tone="protein"
                value={data.meals.totals.protein}
              />
              <MacroBar
                label="Carbs"
                target={targets.carbs}
                tone="carbs"
                value={data.meals.totals.carbs}
              />
              <MacroBar label="Fat" target={targets.fat} tone="fat" value={data.meals.totals.fat} />
            </div>
          </div>
        </Panel>

        <Panel
          action={
            <Link className="panel-link" to="/workouts">
              Full plan →
            </Link>
          }
          className="bento-training"
          eyebrow={`TRAINING · ${titleCase(data.plan?.planJson.splitType ?? "no plan")}`}
          title={todayPlanDay?.label ?? "Your week"}
        >
          <div className="week-strip">
            {WEEKDAY_LABELS.map((label, index) => {
              const day = data.plan?.planJson.days.find((entry) => entry.dayIndex === index);
              const done = derived.trainedWeekdays.has(index);
              return (
                <div
                  className={`week-day${index === today ? " is-today" : ""}${done ? " is-done" : ""}${day?.isRestDay ? " is-rest" : ""}`}
                  key={label}
                  title={day?.label}
                >
                  <span>{label}</span>
                  <span className="week-day-dot" aria-hidden="true">
                    {done ? "✓" : day?.isRestDay ? "·" : ""}
                  </span>
                </div>
              );
            })}
          </div>
          {todayPlanDay?.isRestDay ? (
            <EmptyState icon="🧘" title="Scheduled rest day">
              <p>Recovery is where the gains happen.</p>
            </EmptyState>
          ) : todayExercises.length > 0 ? (
            <ul className="exercise-list">
              {todayExercises.map((exercise, index) => (
                <li key={`${exercise.dayIndex}-${exercise.orderIndex}`}>
                  <span className="exercise-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="exercise-name">
                    {exercise.name}
                    <small>{titleCase(exercise.muscleGroup)}</small>
                  </span>
                  <span className="exercise-scheme">
                    {exercise.targetSets} × {exercise.targetRepsMin}–{exercise.targetRepsMax}
                    <small>RPE {exercise.targetRpe}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="🗓️" title={data.plan ? "Nothing scheduled today" : "No plan yet"}>
              <Link className="button button-secondary" to="/workouts">
                {data.plan ? "View plan" : "Generate with AI"}
              </Link>
            </EmptyState>
          )}
          {!todayPlanDay?.isRestDay && todayExercises.length > 0 && (
            <button
              className="button button-primary button-full"
              disabled={starting || trainedToday}
              onClick={() => void startSession()}
              type="button"
            >
              {trainedToday ? "✓ Completed today" : starting ? "Starting…" : "Start this session"}
            </button>
          )}
        </Panel>

        <Panel className="bento-insights" eyebrow="AI COACH" title="Insights for today">
          <ul className="insight-list">
            {insights.slice(0, 4).map((insight) => (
              <li className={`insight insight-${insight.tone}`} key={insight.title}>
                <span aria-hidden="true" className="insight-icon">
                  {insight.icon}
                </span>
                <div>
                  <strong>{insight.title}</strong>
                  <p>{insight.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          className="bento-chart"
          eyebrow={`NUTRITION · 14 DAYS · AVG ${formatNumber(derived.averageCalories)} KCAL`}
          title="Calories vs target"
        >
          <div className="chart-box">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={derived.last14}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={chartTick} tickFormatter={shortDate} />
                <YAxis tick={chartTick} width={44} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  cursor={{ fill: "color-mix(in srgb, var(--accent) 8%, transparent)" }}
                  formatter={(value) => [`${value} kcal`, "Calories"]}
                  labelFormatter={shortDate}
                />
                <ReferenceLine
                  label={{ value: "target", fill: "var(--muted)", fontSize: 10, position: "insideTopRight" }}
                  stroke="var(--warm)"
                  strokeDasharray="4 4"
                  y={targets.calories}
                />
                <Bar dataKey="calories" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          action={
            <Link className="panel-link" to="/progress">
              Progress →
            </Link>
          }
          className="bento-chart"
          eyebrow={`BODY · ${derived.weights.length} WEIGH-INS`}
          title="Weight trend"
        >
          {derived.weights.length > 1 ? (
            <div className="chart-box">
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={derived.weights}>
                  <defs>
                    <linearGradient id="weightFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={chartTick} tickFormatter={shortDate} />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={chartTick} width={44} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value) => [`${value} kg`, "Weight"]}
                    labelFormatter={shortDate}
                  />
                  <Area
                    dataKey="weightKg"
                    fill="url(#weightFill)"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon="⚖️" title="Log a couple of weigh-ins">
              <Link className="button button-secondary" to="/progress">
                Add weight
              </Link>
            </EmptyState>
          )}
        </Panel>

        <Panel
          action={
            <Link className="panel-link" to="/nutrition/meal-plan">
              Open planner →
            </Link>
          }
          className="bento-mealplan"
          eyebrow="AI MEAL PLAN · TODAY"
          title={mealPlanToday ? `Day ${mealPlanToday.dayIndex + 1} menu` : "No plan yet"}
        >
          {mealPlanToday ? (
            <ul className="plan-preview">
              {MEAL_SLOTS.map((slot) => {
                const meals = mealPlanToday.meals.filter((meal) => meal.mealSlot === slot);
                if (meals.length === 0) return null;
                return (
                  <li key={slot}>
                    <span className="plan-preview-slot">{slot}</span>
                    <span className="plan-preview-foods">
                      {meals.map((meal) => meal.foodName).join(" + ")}
                    </span>
                    <span className="plan-preview-kcal">
                      {Math.round(meals.reduce((sum, meal) => sum + meal.calories, 0))} kcal
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon="✨" title="Let AI build your menu">
              <p>Personalised to your goal and diet, built only from real catalog foods.</p>
              <Link className="button button-primary" to="/nutrition/meal-plan">
                Generate plan
              </Link>
            </EmptyState>
          )}
        </Panel>

        <Panel className="bento-records" eyebrow="STRENGTH" title="Personal records">
          {derived.records.length > 0 ? (
            <ul className="record-list">
              {derived.records.map((record) => (
                <li key={record.exerciseId}>
                  <span aria-hidden="true" className="record-medal">
                    🏆
                  </span>
                  <span className="record-name">
                    {record.name}
                    <small>{titleCase(record.muscleGroup)}</small>
                  </span>
                  <span className="record-value">
                    {record.weightKg} kg × {record.reps}
                    <small>e1RM {record.estimatedMax.toFixed(0)} kg</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="🏆" title="Your first PRs will appear here" />
          )}
        </Panel>

        <Panel
          action={
            <Link className="panel-link" to="/nutrition">
              Add food →
            </Link>
          }
          className="bento-meals"
          eyebrow="NUTRITION LOG"
          title="Today's meals"
        >
          {data.meals.mealLogs.length > 0 ? (
            <ul className="meal-timeline">
              {MEAL_SLOTS.map((slot) => {
                const logs = data.meals.mealLogs.filter((log) => log.mealSlot === slot);
                const items = logs.flatMap((log) => log.items);
                if (items.length === 0) return null;
                return (
                  <li key={slot}>
                    <span className="meal-timeline-slot">{slot}</span>
                    <span className="meal-timeline-foods">
                      {items.map((item) => item.foodName).join(", ")}
                    </span>
                    <span className="meal-timeline-kcal">
                      {Math.round(items.reduce((sum, item) => sum + item.calories, 0))} kcal
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon="🍽️" title="Nothing logged yet today">
              <Link className="button button-secondary" to="/nutrition/add">
                Log your first meal
              </Link>
            </EmptyState>
          )}
        </Panel>

        <Panel
          action={
            <Link className="panel-link" to="/workouts">
              History →
            </Link>
          }
          className="bento-sessions"
          eyebrow="RECENT WORK"
          title="Training sessions"
        >
          {derived.completed.length > 0 ? (
            <ul className="session-list">
              {derived.completed.slice(0, 4).map((session) => {
                const prs = session.sets.filter((set) => set.isPr).length;
                const groups = [...new Set(session.sets.map((set) => set.exercise?.muscleGroup))]
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((group) => titleCase(group));
                return (
                  <li key={session.id}>
                    <span className="session-date">
                      <strong>{new Date(session.completedAt as string).getDate()}</strong>
                      {new Date(session.completedAt as string).toLocaleDateString(undefined, {
                        month: "short",
                      })}
                    </span>
                    <span className="session-info">
                      {groups.join(" · ") || "Session"}
                      <small>
                        {new Set(session.sets.map((set) => set.exerciseId)).size} exercises ·{" "}
                        {session.sets.length} sets · {formatNumber(sessionVolume(session.sets))} kg
                      </small>
                    </span>
                    {prs > 0 && <span className="pill pill-accent">{prs} PR</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon="🏋️" title="No sessions yet">
              <p>Start your first workout to build history.</p>
            </EmptyState>
          )}
        </Panel>
      </section>
    </div>
  );
}
