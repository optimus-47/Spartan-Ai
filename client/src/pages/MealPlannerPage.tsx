import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  chartTick,
  chartTooltipStyle,
  EmptyState,
  ErrorState,
  LoadingState,
  MacroBar,
  PageHeader,
  Panel,
  StatCard,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api, isApiError, type AiMealPlan, type DietType, type MealPlanMeal } from "../lib/api";
import { computeTargets, dateKey, DIET_LABELS, formatNumber, GOAL_LABELS, MEAL_SLOTS } from "../lib/fitness";

const DIET_OPTIONS: Array<{ value: DietType; icon: string }> = [
  { value: "vegetarian", icon: "🥦" },
  { value: "eggetarian", icon: "🥚" },
  { value: "vegan", icon: "🌱" },
  { value: "non_vegetarian", icon: "🍗" },
];

const SLOT_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  snack: "🍎",
  dinner: "🌙",
};

function isDietType(value: string | null | undefined): value is DietType {
  return DIET_OPTIONS.some((option) => option.value === value);
}

export function MealPlannerPage() {
  const { profile } = useAuth();
  const targets = useMemo(() => computeTargets(profile), [profile]);
  const [plan, setPlan] = useState<AiMealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dietType, setDietType] = useState<DietType>(() => {
    const preference = profile?.foodPreference;
    return isDietType(preference) ? preference : "vegetarian";
  });
  const [days, setDays] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [activeDay, setActiveDay] = useState(0);
  const [logging, setLogging] = useState<string | null>(null);
  const [logged, setLogged] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPlan(await api.getLatestMealPlan());
    } catch (requestError) {
      if (isApiError(requestError) && requestError.status === 404) {
        setPlan(null);
      } else {
        setError(isApiError(requestError) ? requestError.message : "Could not load your meal plan.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    setGenerateError("");
    try {
      const next = await api.generateMealPlan(dietType, days);
      setPlan(next);
      setActiveDay(0);
      setLogged(new Set());
    } catch (requestError) {
      setGenerateError(
        isApiError(requestError) ? requestError.message : "The AI could not build a plan. Please retry.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  };

  const logMeals = async (key: string, meals: MealPlanMeal[]) => {
    setLogging(key);
    try {
      const today = dateKey();
      for (const meal of meals) {
        await api.logMeal({
          logDate: today,
          mealSlot: meal.mealSlot,
          foodId: meal.foodId,
          quantityG: meal.quantityG,
        });
      }
      setLogged((previous) => new Set(previous).add(key));
      flash(`Logged ${meals.length} item${meals.length > 1 ? "s" : ""} to today's diary.`);
    } catch (requestError) {
      flash(isApiError(requestError) ? requestError.message : "Could not log those meals.");
    } finally {
      setLogging(null);
    }
  };

  if (loading) return <LoadingState label="Loading meal planner" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} title="Meal planner could not load." />;

  const planDays = plan?.generatedPlan.days ?? [];
  const day = planDays[Math.min(activeDay, Math.max(planDays.length - 1, 0))];
  const dayCalories = day?.meals.reduce((sum, meal) => sum + meal.calories, 0) ?? 0;
  const dayProtein = day?.meals.reduce((sum, meal) => sum + meal.protein, 0) ?? 0;
  const chartData = planDays.map((entry) => ({
    day: `Day ${entry.dayIndex + 1}`,
    calories: Math.round(entry.meals.reduce((sum, meal) => sum + meal.calories, 0)),
    protein: Math.round(entry.meals.reduce((sum, meal) => sum + meal.protein, 0)),
  }));
  const avgCalories = chartData.length
    ? chartData.reduce((sum, entry) => sum + entry.calories, 0) / chartData.length
    : 0;
  const avgProtein = chartData.length
    ? chartData.reduce((sum, entry) => sum + entry.protein, 0) / chartData.length
    : 0;
  const uniqueFoods = new Set(planDays.flatMap((entry) => entry.meals.map((meal) => meal.foodId))).size;

  return (
    <div className="app-page">
      <PageHeader
        eyebrow="AI MEAL PLANNER"
        lede="Gemini builds a multi-day menu using only foods from the verified catalog that match your diet."
        title="Your personalised menu"
      />

      {notice && (
        <div className="toast" role="status">
          ✓ {notice}
        </div>
      )}

      <Panel className="ai-panel planner-generator" eyebrow="✨ GENERATE" title="Build a new plan">
        <div className="planner-controls">
          <div>
            <p className="field-label">Diet type</p>
            <div className="split-grid split-grid-4">
              {DIET_OPTIONS.map((option) => (
                <button
                  aria-pressed={dietType === option.value}
                  className={`split-option${dietType === option.value ? " is-selected" : ""}`}
                  key={option.value}
                  onClick={() => setDietType(option.value)}
                  type="button"
                >
                  <span aria-hidden="true" className="split-option-icon">
                    {option.icon}
                  </span>
                  <strong>{DIET_LABELS[option.value]}</strong>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="field-label">Length</p>
            <div className="slot-picker">
              {[1, 3, 5, 7].map((value) => (
                <button
                  aria-pressed={days === value}
                  className={`slot-chip${days === value ? " is-selected" : ""}`}
                  key={value}
                  onClick={() => setDays(value)}
                  type="button"
                >
                  {value} day{value > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="planner-footer">
          <p className="panel-copy">
            Goal: <strong>{GOAL_LABELS[profile?.goal ?? ""] ?? "General fitness"}</strong> · Target ≈{" "}
            <strong>{formatNumber(targets.calories)} kcal</strong> / {targets.protein} g protein
          </p>
          <button className="button button-primary" disabled={generating} onClick={() => void generate()} type="button">
            {generating ? "Cooking up your plan…" : plan ? "Regenerate plan" : "Generate plan"}
          </button>
        </div>
        {generating && (
          <div className="ai-progress" role="status">
            <span className="ai-progress-bar" />
            <span>AI is balancing macros across {days} day{days > 1 ? "s" : ""}. This can take up to a minute.</span>
          </div>
        )}
        {generateError && (
          <p className="form-error" role="alert">
            {generateError}
          </p>
        )}
      </Panel>

      {!plan || planDays.length === 0 ? (
        <Panel>
          <EmptyState icon="🍽️" title="No meal plan yet">
            <p>Choose your diet and length above, then generate your first AI menu.</p>
          </EmptyState>
        </Panel>
      ) : (
        <>
          <section className="stat-grid">
            <StatCard hint="kcal per day" icon="🔥" label="Avg energy" value={formatNumber(avgCalories)} />
            <StatCard hint="g per day" icon="💪" label="Avg protein" value={formatNumber(avgProtein)} />
            <StatCard hint="different foods" icon="🥗" label="Variety" value={uniqueFoods} />
            <StatCard
              hint={new Date(plan.generatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
              icon="🧠"
              label="Diet"
              value={DIET_LABELS[plan.dietType ?? plan.generatedPlan.dietType] ?? "Custom"}
            />
          </section>

          <div className="day-tabs" role="tablist">
            {planDays.map((entry, index) => (
              <button
                aria-selected={index === activeDay}
                className={`day-tab${index === activeDay ? " is-active" : ""}`}
                key={entry.dayIndex}
                onClick={() => setActiveDay(index)}
                role="tab"
                type="button"
              >
                <span>Day {entry.dayIndex + 1}</span>
                <small>{Math.round(entry.meals.reduce((sum, meal) => sum + meal.calories, 0))} kcal</small>
              </button>
            ))}
          </div>

          {day && (
            <div className="planner-layout">
              <section className="planner-meals">
                {MEAL_SLOTS.map((slot) => {
                  const meals = day.meals.filter((meal) => meal.mealSlot === slot);
                  if (meals.length === 0) return null;
                  const key = `${day.dayIndex}-${slot}`;
                  const kcal = meals.reduce((sum, meal) => sum + meal.calories, 0);
                  return (
                    <article className="planner-meal" key={slot}>
                      <div className="planner-meal-head">
                        <span aria-hidden="true" className="planner-meal-icon">
                          {SLOT_ICONS[slot]}
                        </span>
                        <div>
                          <p className="eyebrow">{slot.toUpperCase()}</p>
                          <strong>{Math.round(kcal)} kcal</strong>
                        </div>
                        <button
                          className={`button ${logged.has(key) ? "button-secondary" : "button-ghost"}`}
                          disabled={logging !== null || logged.has(key)}
                          onClick={() => void logMeals(key, meals)}
                          type="button"
                        >
                          {logged.has(key) ? "✓ Logged" : logging === key ? "Logging…" : "Log today"}
                        </button>
                      </div>
                      <ul className="food-items">
                        {meals.map((meal, index) => (
                          <li key={`${meal.foodId}-${index}`}>
                            <span>
                              {meal.foodName}
                              <small>
                                {Math.round(meal.quantityG)} g · {Math.round(meal.protein)} g protein
                              </small>
                            </span>
                            <strong>{Math.round(meal.calories)}</strong>
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </section>

              <aside className="stack">
                <Panel eyebrow={`DAY ${day.dayIndex + 1} TOTALS`} title={`${formatNumber(dayCalories)} kcal`}>
                  <div className="stack-tight">
                    <MacroBar label="Calories" target={targets.calories} tone="accent" unit=" kcal" value={dayCalories} />
                    <MacroBar label="Protein" target={targets.protein} tone="protein" value={dayProtein} />
                  </div>
                  <button
                    className="button button-primary button-full"
                    disabled={logging !== null || logged.has(`${day.dayIndex}-all`)}
                    onClick={() => void logMeals(`${day.dayIndex}-all`, day.meals)}
                    type="button"
                  >
                    {logged.has(`${day.dayIndex}-all`)
                      ? "✓ Whole day logged"
                      : logging === `${day.dayIndex}-all`
                        ? "Logging…"
                        : "Log the whole day to today"}
                  </button>
                </Panel>
                {chartData.length > 1 && (
                  <Panel eyebrow="PLAN OVERVIEW" title="Calories by day">
                    <div className="chart-box chart-box-small">
                      <ResponsiveContainer height="100%" width="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                          <XAxis axisLine={false} dataKey="day" tick={chartTick} tickLine={false} />
                          <YAxis axisLine={false} tick={chartTick} tickLine={false} width={40} />
                          <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "var(--accent-dim)" }} />
                          <Bar dataKey="calories" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>
                )}
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}
