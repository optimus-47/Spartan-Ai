import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatCard } from "../components/ui";
import {
  api,
  isApiError,
  type ActiveWorkoutPlan,
  type Exercise,
  type FinishedSession,
  type WorkoutSessionSummary,
  type WorkoutSet,
} from "../lib/api";
import { formatNumber, sessionVolume, titleCase, weekdayIndex } from "../lib/fitness";

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

interface Target {
  sets: number;
  repsMin: number;
  repsMax: number;
  rpe: number;
}

export function WorkoutSessionPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<WorkoutSessionSummary | null>(null);
  const [plan, setPlan] = useState<ActiveWorkoutPlan | null>(null);
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [history, setHistory] = useState<WorkoutSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [activeExerciseId, setActiveExerciseId] = useState<string>("");
  const [extraExerciseIds, setExtraExerciseIds] = useState<string[]>([]);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [prFlash, setPrFlash] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [summary, setSummary] = useState<FinishedSession | null>(null);
  const [addPick, setAddPick] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [current, activePlan, exercises, sessions] = await Promise.all([
        api.getWorkoutSession(sessionId),
        api.getActiveWorkoutPlan(),
        api.getExercises(),
        api.getWorkoutSessions(),
      ]);
      setSession(current);
      setPlan(activePlan);
      setCatalog(exercises);
      setHistory(sessions.filter((entry) => entry.id !== sessionId));
    } catch (requestError) {
      setError(isApiError(requestError) ? requestError.message : "Could not load this session.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const plannedToday = useMemo(() => {
    const today = weekdayIndex();
    const planned = plan?.planJson.exercises
      .filter((exercise) => exercise.dayIndex === today)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    return planned ?? [];
  }, [plan]);

  const targets = useMemo(() => {
    const map = new Map<string, Target>();
    for (const exercise of plannedToday) {
      map.set(exercise.exerciseId, {
        sets: exercise.targetSets,
        repsMin: exercise.targetRepsMin,
        repsMax: exercise.targetRepsMax,
        rpe: exercise.targetRpe,
      });
    }
    return map;
  }, [plannedToday]);

  const exerciseOrder = useMemo(() => {
    const ids: string[] = plannedToday.map((exercise) => exercise.exerciseId);
    for (const set of session?.sets ?? []) {
      if (!ids.includes(set.exerciseId)) ids.push(set.exerciseId);
    }
    for (const id of extraExerciseIds) if (!ids.includes(id)) ids.push(id);
    return ids;
  }, [plannedToday, session?.sets, extraExerciseIds]);

  const catalogById = useMemo(() => new Map(catalog.map((exercise) => [exercise.id, exercise])), [catalog]);

  // History is newest-first, so the first session containing an exercise is the most recent one.
  const lastTime = useMemo(() => {
    const map = new Map<string, WorkoutSet[]>();
    for (const past of history) {
      const grouped = new Map<string, WorkoutSet[]>();
      for (const set of past.sets) {
        const list = grouped.get(set.exerciseId) ?? [];
        list.push(set);
        grouped.set(set.exerciseId, list);
      }
      for (const [id, sets] of grouped) {
        if (!map.has(id)) map.set(id, sets.sort((a, b) => a.setIndex - b.setIndex));
      }
    }
    return map;
  }, [history]);

  useEffect(() => {
    if (!activeExerciseId && exerciseOrder.length > 0) setActiveExerciseId(exerciseOrder[0]);
  }, [activeExerciseId, exerciseOrder]);

  useEffect(() => {
    const previous = lastTime.get(activeExerciseId)?.at(-1);
    const target = targets.get(activeExerciseId);
    setWeight(previous ? String(previous.weightKg) : "");
    setReps(previous ? String(previous.reps) : target ? String(target.repsMax) : "");
    setFormError("");
  }, [activeExerciseId, lastTime, targets]);

  if (loading) return <LoadingState label="Loading session" />;
  if (error || !session) {
    return (
      <ErrorState
        message={error || "Session not found."}
        onRetry={() => void load()}
        title="This session could not load."
      />
    );
  }

  const setsFor = (exerciseId: string) =>
    session.sets.filter((set) => set.exerciseId === exerciseId).sort((a, b) => a.setIndex - b.setIndex);
  const elapsed = (session.completedAt ? new Date(session.completedAt).getTime() : now) -
    new Date(session.startedAt).getTime();
  const volume = sessionVolume(session.sets);
  const prCount = session.sets.filter((set) => set.isPr).length;
  const activeExercise = catalogById.get(activeExerciseId);
  const activeTarget = targets.get(activeExerciseId);
  const activeSets = setsFor(activeExerciseId);
  const finished = Boolean(session.completedAt) || summary !== null;
  const remainingCatalog = catalog.filter((exercise) => !exerciseOrder.includes(exercise.id));

  const logSet = async (event: FormEvent) => {
    event.preventDefault();
    const weightKg = Number(weight);
    const repCount = Number(reps);
    if (!activeExerciseId) return setFormError("Pick an exercise first.");
    if (!(weightKg > 0)) return setFormError("Enter a weight above 0 kg.");
    if (!Number.isInteger(repCount) || repCount < 1) return setFormError("Enter whole reps (1 or more).");
    setSaving(true);
    setFormError("");
    try {
      const created = await api.logWorkoutSet(session.id, {
        exerciseId: activeExerciseId,
        weightKg,
        reps: repCount,
      });
      const exercise = catalogById.get(activeExerciseId);
      setSession({
        ...session,
        sets: [
          ...session.sets,
          {
            ...created,
            exercise: {
              id: activeExerciseId,
              name: exercise?.name ?? "Exercise",
              muscleGroup: exercise?.muscleGroup ?? "other",
            },
          },
        ],
      });
      if (created.isPr) {
        setPrFlash(`New PR on ${exercise?.name ?? "this lift"}! ${weightKg} kg × ${repCount}`);
        window.setTimeout(() => setPrFlash(""), 4000);
      }
    } catch (requestError) {
      setFormError(isApiError(requestError) ? requestError.message : "Could not save the set.");
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    setFinishing(true);
    try {
      const result = await api.finishWorkoutSession(session.id);
      setSummary(result);
      setSession({ ...session, completedAt: new Date().toISOString() });
    } catch (requestError) {
      setFormError(isApiError(requestError) ? requestError.message : "Could not finish the session.");
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="app-page">
      <PageHeader
        actions={
          finished ? (
            <Link className="button button-secondary" to="/workouts">
              Back to workouts
            </Link>
          ) : (
            <button
              className="button button-primary"
              disabled={finishing || session.sets.length === 0}
              onClick={() => void finish()}
              type="button"
            >
              {finishing ? "Finishing…" : "Finish workout"}
            </button>
          )
        }
        eyebrow={finished ? "SESSION COMPLETE" : "LIVE SESSION"}
        lede={
          finished
            ? "Nice work. Everything is saved to your history."
            : "Log each set as you go. PRs are detected automatically from your estimated 1RM."
        }
        title={finished ? "Workout complete 🎉" : "Workout in progress"}
      />

      {prFlash && (
        <div className="pr-toast" role="status">
          🏆 {prFlash}
        </div>
      )}

      <section className="stat-grid">
        <StatCard icon="⏱️" label="Elapsed" value={formatElapsed(elapsed)} />
        <StatCard icon="🔁" label="Sets" value={session.sets.length} />
        <StatCard icon="⚡" label="Volume" value={`${formatNumber(volume)} kg`} />
        <StatCard icon="🏆" label="PRs" value={prCount} />
      </section>

      {summary && (
        <Panel className="summary-panel" eyebrow="SUMMARY" title="Session recap">
          <div className="summary-grid">
            <div>
              <strong>{summary.setCount}</strong>
              <span>sets</span>
            </div>
            <div>
              <strong>{formatNumber(summary.totalVolumeKg)}</strong>
              <span>kg moved</span>
            </div>
            <div>
              <strong>{summary.prCount}</strong>
              <span>personal records</span>
            </div>
          </div>
          <div className="summary-actions">
            <button className="button button-primary" onClick={() => navigate("/dashboard")} type="button">
              Go to dashboard
            </button>
            <Link className="button button-secondary" to="/nutrition/add">
              Log post-workout meal
            </Link>
          </div>
        </Panel>
      )}

      <div className="two-col session-layout">
        <Panel eyebrow="EXERCISES" title={plannedToday.length ? "Today's plan" : "Your session"}>
          {exerciseOrder.length === 0 ? (
            <EmptyState icon="➕" title="Add an exercise to begin" />
          ) : (
            <ul className="session-exercises">
              {exerciseOrder.map((id) => {
                const exercise = catalogById.get(id);
                const done = setsFor(id).length;
                const target = targets.get(id);
                const complete = target ? done >= target.sets : done > 0;
                return (
                  <li key={id}>
                    <button
                      className={`session-exercise${id === activeExerciseId ? " is-active" : ""}${complete ? " is-complete" : ""}`}
                      onClick={() => setActiveExerciseId(id)}
                      type="button"
                    >
                      <span className="session-exercise-check" aria-hidden="true">
                        {complete ? "✓" : done || ""}
                      </span>
                      <span className="exercise-name">
                        {exercise?.name ?? "Exercise"}
                        <small>{titleCase(exercise?.muscleGroup)}</small>
                      </span>
                      <span className="exercise-scheme">
                        {done}/{target?.sets ?? "—"}
                        <small>sets</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!finished && remainingCatalog.length > 0 && (
            <div className="add-exercise">
              <select
                aria-label="Add another exercise"
                onChange={(event) => setAddPick(event.target.value)}
                value={addPick}
              >
                <option value="">+ Add another exercise…</option>
                {remainingCatalog.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name} · {titleCase(exercise.muscleGroup)}
                  </option>
                ))}
              </select>
              <button
                className="button button-secondary"
                disabled={!addPick}
                onClick={() => {
                  setExtraExerciseIds([...extraExerciseIds, addPick]);
                  setActiveExerciseId(addPick);
                  setAddPick("");
                }}
                type="button"
              >
                Add
              </button>
            </div>
          )}
        </Panel>

        <Panel
          className="logger-panel"
          eyebrow={activeTarget ? `TARGET ${activeTarget.sets} × ${activeTarget.repsMin}–${activeTarget.repsMax} @ RPE ${activeTarget.rpe}` : "FREE LOGGING"}
          title={activeExercise?.name ?? "Pick an exercise"}
        >
          {activeExercise?.instructions && <p className="panel-copy">{activeExercise.instructions}</p>}
          {(lastTime.get(activeExerciseId)?.length ?? 0) > 0 && (
            <p className="last-time">
              Last time:{" "}
              {lastTime
                .get(activeExerciseId)
                ?.map((set) => `${set.weightKg}×${set.reps}`)
                .join(" · ")}
            </p>
          )}

          <ul className="logged-sets">
            {activeSets.map((set, index) => (
              <li className={set.isPr ? "is-pr" : ""} key={set.id}>
                <span>Set {index + 1}</span>
                <strong>
                  {set.weightKg} kg × {set.reps}
                </strong>
                <span>{set.isPr ? "🏆 PR" : `${formatNumber(set.weightKg * set.reps)} kg`}</span>
              </li>
            ))}
            {activeSets.length === 0 && <li className="logged-empty">No sets logged yet.</li>}
          </ul>

          {!finished && activeExerciseId && (
            <form className="set-form" onSubmit={(event) => void logSet(event)}>
              <label className="field">
                Weight (kg)
                <div className="stepper">
                  <button onClick={() => setWeight(String(Math.max(0, (Number(weight) || 0) - 2.5)))} type="button">
                    −
                  </button>
                  <input
                    inputMode="decimal"
                    min="0"
                    onChange={(event) => setWeight(event.target.value)}
                    step="0.5"
                    type="number"
                    value={weight}
                  />
                  <button onClick={() => setWeight(String((Number(weight) || 0) + 2.5))} type="button">
                    +
                  </button>
                </div>
              </label>
              <label className="field">
                Reps
                <div className="stepper">
                  <button onClick={() => setReps(String(Math.max(1, (Number(reps) || 1) - 1)))} type="button">
                    −
                  </button>
                  <input
                    inputMode="numeric"
                    min="1"
                    onChange={(event) => setReps(event.target.value)}
                    step="1"
                    type="number"
                    value={reps}
                  />
                  <button onClick={() => setReps(String((Number(reps) || 0) + 1))} type="button">
                    +
                  </button>
                </div>
              </label>
              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}
              <button className="button button-primary button-full" disabled={saving} type="submit">
                {saving ? "Saving…" : `Log set ${activeSets.length + 1}`}
              </button>
            </form>
          )}
        </Panel>
      </div>
    </div>
  );
}
