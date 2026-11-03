import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import {
  api,
  isApiError,
  type ActiveWorkoutPlan,
  type WorkoutSessionSummary,
} from "../lib/api";
import {
  formatNumber,
  personalRecords,
  sessionVolume,
  shortDate,
  titleCase,
  WEEKDAY_LABELS,
  weekdayIndex,
} from "../lib/fitness";

const SPLITS = [
  ["upper_lower", "Upper / Lower"],
  ["ppl", "Push / Pull / Legs"],
  ["bro_split", "Bro split"],
  ["arnold", "Arnold split"],
  ["powerlifting", "Powerlifting"],
  ["bodybuilding", "Bodybuilding"],
  ["home", "Home workout"],
  ["calisthenics", "Calisthenics"],
];

export function WorkoutsPage({ focusHistory = false }: { focusHistory?: boolean }) {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<ActiveWorkoutPlan | null>(null);
  const [sessions, setSessions] = useState<WorkoutSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedDay, setSelectedDay] = useState(weekdayIndex());
  const [split, setSplit] = useState("upper_lower");
  const [generating, setGenerating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openInstructions, setOpenInstructions] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [activePlan, history] = await Promise.all([
        api.getActiveWorkoutPlan(),
        api.getWorkoutSessions(),
      ]);
      setPlan(activePlan);
      setSessions(history);
      if (activePlan?.planJson.splitType && SPLITS.some(([value]) => value === activePlan.planJson.splitType)) {
        setSplit(activePlan.planJson.splitType);
      }
    } catch (requestError) {
      setError(isApiError(requestError) ? requestError.message : "Could not load workouts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (focusHistory && !loading) {
      document.getElementById("workout-history")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [focusHistory, loading]);

  const completed = useMemo(() => sessions.filter((session) => session.completedAt), [sessions]);
  const inProgress = useMemo(() => sessions.find((session) => !session.completedAt), [sessions]);
  const records = useMemo(() => personalRecords(completed), [completed]);
  const volumeData = useMemo(
    () =>
      completed
        .slice(0, 10)
        .reverse()
        .map((session) => ({
          date: (session.completedAt as string).slice(0, 10),
          volume: Math.round(sessionVolume(session.sets)),
        })),
    [completed],
  );

  if (loading) return <LoadingState label="Loading workouts" />;
  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} title="Workouts could not load." />;
  }

  const day = plan?.planJson.days.find((entry) => entry.dayIndex === selectedDay);
  const dayExercises =
    plan?.planJson.exercises
      .filter((exercise) => exercise.dayIndex === selectedDay)
      .sort((a, b) => a.orderIndex - b.orderIndex) ?? [];
  const totalVolume = completed.reduce((sum, session) => sum + sessionVolume(session.sets), 0);
  const totalSets = completed.reduce((sum, session) => sum + session.sets.length, 0);
  const trainingDays = plan?.planJson.days.filter((entry) => !entry.isRestDay).length ?? 0;

  const generate = async () => {
    setGenerating(true);
    setActionError("");
    try {
      await api.generateWorkoutPlan(split);
      const activePlan = await api.getActiveWorkoutPlan();
      setPlan(activePlan);
    } catch (requestError) {
      setActionError(
        isApiError(requestError) ? requestError.message : "The AI could not build a plan right now.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const start = async () => {
    if (inProgress) {
      navigate(`/workouts/session/${inProgress.id}`);
      return;
    }
    setStarting(true);
    setActionError("");
    try {
      const session = await api.startWorkoutSession(plan?.id);
      navigate(`/workouts/session/${session.id}`);
    } catch (requestError) {
      setActionError(isApiError(requestError) ? requestError.message : "Could not start a session.");
      setStarting(false);
    }
  };

  return (
    <div className="app-page">
      <PageHeader
        actions={
          <button
            className="button button-primary"
            disabled={starting}
            onClick={() => void start()}
            type="button"
          >
            {inProgress ? "Resume session" : starting ? "Starting…" : "Start workout"}
          </button>
        }
        eyebrow="TRAINING"
        lede="Your AI-built week, live set logging with automatic PR detection, and full history."
        title="Workouts"
      />

      {actionError && (
        <p className="inline-alert" role="alert">
          {actionError}
        </p>
      )}

      <section className="stat-grid">
        <StatCard hint="completed" icon="🏋️" label="Sessions" value={completed.length} />
        <StatCard hint="across all sessions" icon="🔁" label="Sets logged" value={totalSets} />
        <StatCard
          hint="total lifted"
          icon="⚡"
          label="Volume"
          value={`${formatNumber(totalVolume / 1000, 1)} t`}
        />
        <StatCard
          hint={`${trainingDays} training days / week`}
          icon="🗓️"
          label="Split"
          value={titleCase(plan?.planJson.splitType ?? "None")}
        />
      </section>

      <div className="two-col">
        <Panel
          className="plan-panel"
          eyebrow={plan ? `GENERATED ${shortDate(plan.generatedAt).toUpperCase()}` : "NO ACTIVE PLAN"}
          title="Weekly plan"
        >
          <div className="day-tabs" role="tablist">
            {WEEKDAY_LABELS.map((label, index) => {
              const entry = plan?.planJson.days.find((item) => item.dayIndex === index);
              return (
                <button
                  aria-selected={selectedDay === index}
                  className={`day-tab${selectedDay === index ? " is-active" : ""}${entry?.isRestDay ? " is-rest" : ""}${index === weekdayIndex() ? " is-today" : ""}`}
                  key={label}
                  onClick={() => setSelectedDay(index)}
                  role="tab"
                  type="button"
                >
                  <span>{label}</span>
                  <small>{entry ? (entry.isRestDay ? "Rest" : entry.label.split(" ")[0]) : "—"}</small>
                </button>
              );
            })}
          </div>

          {!plan ? (
            <EmptyState icon="🤖" title="No plan yet">
              <p>Pick a split below and let the AI build a safe plan from your equipment and injuries.</p>
            </EmptyState>
          ) : day?.isRestDay ? (
            <EmptyState icon="🧘" title={day.label || "Rest day"}>
              <p>Light walking, mobility work and good sleep.</p>
            </EmptyState>
          ) : dayExercises.length === 0 ? (
            <EmptyState icon="🗓️" title="Nothing scheduled" />
          ) : (
            <>
              <h3 className="day-title">{day?.label}</h3>
              <ul className="exercise-list exercise-list-detailed">
                {dayExercises.map((exercise, index) => {
                  const key = `${exercise.dayIndex}-${exercise.orderIndex}`;
                  const record = records.find((entry) => entry.exerciseId === exercise.exerciseId);
                  return (
                    <li key={key}>
                      <span className="exercise-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="exercise-name">
                        {exercise.name}
                        <small>
                          {titleCase(exercise.muscleGroup)}
                          {record ? ` · best ${record.weightKg} kg × ${record.reps}` : ""}
                        </small>
                        {exercise.instructions && (
                          <button
                            className="link-button"
                            onClick={() => setOpenInstructions(openInstructions === key ? null : key)}
                            type="button"
                          >
                            {openInstructions === key ? "Hide cues" : "Form cues"}
                          </button>
                        )}
                        {openInstructions === key && (
                          <span className="exercise-cues">{exercise.instructions}</span>
                        )}
                      </span>
                      <span className="exercise-scheme">
                        {exercise.targetSets} × {exercise.targetRepsMin}–{exercise.targetRepsMax}
                        <small>RPE {exercise.targetRpe}</small>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Panel>

        <div className="stack">
          <Panel className="ai-panel" eyebrow="AI PLAN GENERATOR" title="Build a new week">
            <p className="panel-copy">
              Gemini picks only from exercises that match your equipment and avoid your injuries.
            </p>
            <div className="split-grid">
              {SPLITS.map(([value, label]) => (
                <button
                  aria-pressed={split === value}
                  className={`split-option${split === value ? " is-selected" : ""}`}
                  key={value}
                  onClick={() => setSplit(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              className="button button-primary button-full"
              disabled={generating}
              onClick={() => void generate()}
              type="button"
            >
              {generating ? "AI is programming your week…" : "✨ Generate with AI"}
            </button>
          </Panel>

          <Panel eyebrow="STRENGTH" title="Top lifts">
            {records.length ? (
              <ul className="record-list">
                {records.slice(0, 5).map((record) => (
                  <li key={record.exerciseId}>
                    <span aria-hidden="true" className="record-medal">🏆</span>
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
              <EmptyState icon="🏆" title="Log sets to set records" />
            )}
          </Panel>
        </div>
      </div>

      <Panel eyebrow="LAST 10 SESSIONS" title="Volume per session">
        {volumeData.length ? (
          <div className="chart-box">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={volumeData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={chartTick} tickFormatter={shortDate} />
                <YAxis tick={chartTick} width={52} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) => [`${value} kg`, "Volume"]}
                  labelFormatter={shortDate}
                />
                <Bar dataKey="volume" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState icon="📊" title="No sessions yet" />
        )}
      </Panel>

      <div id="workout-history">
        <Panel eyebrow="HISTORY" title="All sessions">
          {sessions.length === 0 ? (
            <EmptyState icon="🏋️" title="Start your first workout" />
          ) : (
            <ul className="history-list">
              {sessions.map((session) => {
                const isOpen = expanded === session.id;
                const byExercise = new Map<string, typeof session.sets>();
                for (const set of session.sets) {
                  const list = byExercise.get(set.exerciseId) ?? [];
                  list.push(set);
                  byExercise.set(set.exerciseId, list);
                }
                const prs = session.sets.filter((set) => set.isPr).length;
                return (
                  <li className={isOpen ? "is-open" : ""} key={session.id}>
                    <div className="history-row-wrap">
                    <button
                      aria-expanded={isOpen}
                      className="history-row"
                      onClick={() => setExpanded(isOpen ? null : session.id)}
                      type="button"
                    >
                      <span className="session-date">
                        <strong>{new Date(session.completedAt ?? session.startedAt).getDate()}</strong>
                        {new Date(session.completedAt ?? session.startedAt).toLocaleDateString(undefined, {
                          month: "short",
                        })}
                      </span>
                      <span className="session-info">
                        {session.completedAt ? "Completed session" : "In progress"}
                        <small>
                          {byExercise.size} exercises · {session.sets.length} sets ·{" "}
                          {formatNumber(sessionVolume(session.sets))} kg
                        </small>
                      </span>
                      {prs > 0 && <span className="pill pill-accent">{prs} PR</span>}
                      <span aria-hidden="true" className="history-chevron">
                        ▾
                      </span>
                    </button>
                    {!session.completedAt && (
                      <Link className="pill pill-accent" to={`/workouts/session/${session.id}`}>
                        Resume
                      </Link>
                    )}
                    </div>
                    {isOpen && (
                      <div className="history-detail">
                        {[...byExercise.values()].map((sets) => (
                          <div className="history-exercise" key={sets[0].exerciseId}>
                            <strong>{sets[0].exercise?.name ?? "Exercise"}</strong>
                            <div className="set-chips">
                              {sets.map((set) => (
                                <span className={`set-chip${set.isPr ? " is-pr" : ""}`} key={set.id}>
                                  {set.weightKg} × {set.reps}
                                  {set.isPr ? " 🏆" : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                        {byExercise.size === 0 && <p className="panel-copy">No sets logged.</p>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
