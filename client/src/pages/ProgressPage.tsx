import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  chartTick,
  chartTooltipStyle,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  StatCard,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import {
  api,
  isApiError,
  type CaloriesTrendPoint,
  type WeightTrendPoint,
  type WorkoutSessionSummary,
} from "../lib/api";
import {
  bmi,
  completedSessions,
  computeTargets,
  daysAgoKey,
  formatNumber,
  muscleGroupSplit,
  personalRecords,
  sessionVolume,
  shortDate,
  titleCase,
} from "../lib/fitness";

const RANGES = [
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

function bmiCategory(value: number): string {
  if (value < 18.5) return "Underweight";
  if (value < 25) return "Healthy range";
  if (value < 30) return "Overweight";
  return "Obese range";
}

export function ProgressPage() {
  const { profile, refresh } = useAuth();
  const targets = useMemo(() => computeTargets(profile), [profile]);
  const [weights, setWeights] = useState<WeightTrendPoint[]>([]);
  const [calories, setCalories] = useState<CaloriesTrendPoint[]>([]);
  const [sessions, setSessions] = useState<WorkoutSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState(30);
  const [weightInput, setWeightInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [weightData, calorieData, sessionData] = await Promise.all([
        api.getWeightTrend(),
        api.getCaloriesTrend(),
        api.getWorkoutSessions(),
      ]);
      setWeights(weightData);
      setCalories(calorieData);
      setSessions(sessionData);
    } catch (requestError) {
      setError(isApiError(requestError) ? requestError.message : "Could not load your progress.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const logWeight = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(weightInput);
    if (!(value > 20 && value < 400)) {
      setFormMessage({ text: "Enter a weight between 20 and 400 kg.", ok: false });
      return;
    }
    setSaving(true);
    setFormMessage(null);
    try {
      await api.addBodyMetric(value);
      try {
        await api.updateProfile({ weightKg: value });
      } catch {
        // The weigh-in is saved even if the profile weight sync fails.
      }
      setWeightInput("");
      setFormMessage({ text: `Logged ${value} kg.`, ok: true });
      await Promise.all([load(), refresh()]);
    } catch (requestError) {
      setFormMessage({
        text: isApiError(requestError) ? requestError.message : "Could not log your weight.",
        ok: false,
      });
    } finally {
      setSaving(false);
    }
  };

  const completed = useMemo(() => completedSessions(sessions), [sessions]);
  const records = useMemo(() => personalRecords(completed), [completed]);
  const muscleSplit = useMemo(() => muscleGroupSplit(completed), [completed]);

  if (loading) return <LoadingState label="Loading progress" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} title="Progress could not load." />;

  const since = daysAgoKey(range - 1);
  const weightSeries = weights
    .filter((point) => point.recordedAt.slice(0, 10) >= since)
    .map((point) => ({ date: point.recordedAt.slice(0, 10), weight: Number(point.weightKg) }));
  const firstWeight = weights[0]?.weightKg;
  const latestWeight = weights.at(-1)?.weightKg ?? profile?.weightKg ?? null;
  const weightChange =
    latestWeight !== null && firstWeight !== undefined ? Number(latestWeight) - Number(firstWeight) : null;

  const calorieMap = new Map(calories.map((point) => [point.date, point.calories]));
  const calorieSeries = Array.from({ length: range }, (_, index) => {
    const date = daysAgoKey(range - 1 - index);
    return { date, calories: Math.round(calorieMap.get(date) ?? 0) };
  });
  const loggedDays = calorieSeries.filter((point) => point.calories > 0);
  const avgCalories = loggedDays.length
    ? loggedDays.reduce((sum, point) => sum + point.calories, 0) / loggedDays.length
    : 0;
  const onTargetDays = loggedDays.filter(
    (point) => Math.abs(point.calories - targets.calories) <= targets.calories * 0.1,
  ).length;

  const volumeSeries = [...completed]
    .filter((session) => session.startedAt.slice(0, 10) >= since)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((session) => ({
      date: session.startedAt.slice(0, 10),
      volume: Math.round(sessionVolume(session.sets)),
      sets: session.sets.length,
    }));
  const totalVolume = completed.reduce((sum, session) => sum + sessionVolume(session.sets), 0);
  const totalPrs = completed.reduce((sum, session) => sum + session.sets.filter((set) => set.isPr).length, 0);
  const bmiValue = bmi(profile ? { ...profile, weightKg: latestWeight === null ? null : Number(latestWeight) } : null);
  const radarData = muscleSplit.slice(0, 7).map((entry) => ({ group: titleCase(entry.group), sets: entry.sets }));

  return (
    <div className="app-page">
      <PageHeader
        actions={
          <div className="segmented" role="group" aria-label="Range">
            {RANGES.map((option) => (
              <button
                aria-pressed={range === option.days}
                className={range === option.days ? "is-active" : ""}
                key={option.days}
                onClick={() => setRange(option.days)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        }
        eyebrow="PROGRESS"
        lede="Body composition, nutrition adherence and training load in one place."
        title="Your trends"
      />

      <section className="stat-grid">
        <StatCard
          hint={weightChange === null ? "no weigh-ins yet" : "since first weigh-in"}
          icon="⚖️"
          label="Weight"
          trend={
            weightChange === null || Math.abs(weightChange) < 0.05
              ? null
              : {
                  text: `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg`,
                  positive: profile?.goal === "muscle_gain" ? weightChange > 0 : weightChange < 0,
                }
          }
          value={latestWeight === null ? "—" : `${formatNumber(Number(latestWeight), 1)} kg`}
        />
        <StatCard
          hint={bmiValue ? bmiCategory(bmiValue) : "add height & weight"}
          icon="📏"
          label="BMI"
          value={bmiValue ? bmiValue.toFixed(1) : "—"}
        />
        <StatCard
          hint={`${onTargetDays}/${loggedDays.length} days within ±10%`}
          icon="🔥"
          label="Avg intake"
          value={avgCalories ? `${formatNumber(avgCalories)}` : "—"}
        />
        <StatCard
          hint={`${completed.length} sessions · ${totalPrs} PRs`}
          icon="🏋️"
          label="Total volume"
          value={`${formatNumber(totalVolume / 1000, 1)} t`}
        />
      </section>

      <div className="two-col two-col-wide">
        <Panel eyebrow="BODY WEIGHT" title="Weight trend">
          {weightSeries.length > 1 ? (
            <div className="chart-box">
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={weightSeries}>
                  <defs>
                    <linearGradient id="progressWeightFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis axisLine={false} dataKey="date" tick={chartTick} tickFormatter={shortDate} tickLine={false} />
                  <YAxis
                    axisLine={false}
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tick={chartTick}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} labelFormatter={shortDate} />
                  <Area
                    dataKey="weight"
                    fill="url(#progressWeightFill)"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon="⚖️" title="Not enough weigh-ins in this range">
              <p>Log your weight regularly to see a trend line.</p>
            </EmptyState>
          )}
        </Panel>
        <Panel eyebrow="QUICK LOG" title="Log a weigh-in">
          <form className="stack-tight" onSubmit={(event) => void logWeight(event)}>
            <label className="field">
              Weight (kg)
              <input
                inputMode="decimal"
                onChange={(event) => setWeightInput(event.target.value)}
                placeholder={latestWeight ? String(latestWeight) : "e.g. 72.5"}
                step="0.1"
                type="number"
                value={weightInput}
              />
            </label>
            <button className="button button-primary button-full" disabled={saving} type="submit">
              {saving ? "Saving…" : "Save weigh-in"}
            </button>
            {formMessage && (
              <p className={formMessage.ok ? "form-success" : "form-error"} role="status">
                {formMessage.text}
              </p>
            )}
          </form>
          <p className="panel-copy">
            Tip: weigh in first thing in the morning, after the bathroom and before eating, for the most
            consistent readings.
          </p>
        </Panel>
      </div>

      <Panel eyebrow="NUTRITION ADHERENCE" title={`Calories vs ${formatNumber(targets.calories)} kcal target`}>
        {loggedDays.length ? (
          <div className="chart-box">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={calorieSeries}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="date"
                  interval="preserveStartEnd"
                  minTickGap={16}
                  tick={chartTick}
                  tickFormatter={shortDate}
                  tickLine={false}
                />
                <YAxis axisLine={false} tick={chartTick} tickLine={false} width={44} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "var(--accent-dim)" }} labelFormatter={shortDate} />
                <ReferenceLine stroke="var(--warm)" strokeDasharray="5 5" y={targets.calories} />
                <Bar dataKey="calories" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState icon="🍽️" title="No meals logged in this range" />
        )}
      </Panel>

      <div className="two-col">
        <Panel eyebrow="TRAINING LOAD" title="Volume per session">
          {volumeSeries.length ? (
            <div className="chart-box">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={volumeSeries}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis axisLine={false} dataKey="date" tick={chartTick} tickFormatter={shortDate} tickLine={false} />
                  <YAxis axisLine={false} tick={chartTick} tickLine={false} width={48} />
                  <Tooltip contentStyle={chartTooltipStyle} labelFormatter={shortDate} />
                  <Line
                    dataKey="volume"
                    dot={{ r: 3, fill: "var(--cool)" }}
                    stroke="var(--cool)"
                    strokeWidth={2.5}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon="🏋️" title="No sessions in this range" />
          )}
        </Panel>
        <Panel eyebrow="BALANCE" title="Sets by muscle group">
          {radarData.length >= 3 ? (
            <div className="chart-box">
              <ResponsiveContainer height="100%" width="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="group" tick={chartTick} />
                  <Radar dataKey="sets" fill="var(--accent)" fillOpacity={0.3} stroke="var(--accent)" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon="🎯" title="Train more muscle groups to see your balance" />
          )}
        </Panel>
      </div>

      <Panel eyebrow="HALL OF FAME" title="Personal records">
        {records.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th>Muscle</th>
                  <th>Best set</th>
                  <th>Est. 1RM</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 12).map((record, index) => (
                  <tr key={record.exerciseId}>
                    <td>
                      <span className="record-medal">{index < 3 ? ["🥇", "🥈", "🥉"][index] : "🏅"}</span>
                      {record.name}
                    </td>
                    <td>
                      <span className="pill">{titleCase(record.muscleGroup)}</span>
                    </td>
                    <td>
                      {formatNumber(record.weightKg, record.weightKg % 1 ? 1 : 0)} kg × {record.reps}
                    </td>
                    <td>
                      <strong>{formatNumber(record.estimatedMax, 1)} kg</strong>
                    </td>
                    <td>{shortDate(record.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="🏆" title="Log some sets to start setting records" />
        )}
      </Panel>
    </div>
  );
}
