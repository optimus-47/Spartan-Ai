import type { UserProfile, WorkoutSessionSummary, WorkoutSet } from "./api";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const MEAL_SLOTS = ["breakfast", "lunch", "snack", "dinner"] as const;

export const GOAL_LABELS: Record<string, string> = {
  fat_loss: "Lose fat",
  muscle_gain: "Gain muscle",
  maintenance: "Maintain",
  strength: "Build strength",
  general_fitness: "General fitness",
};

export const DIET_LABELS: Record<string, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  non_vegetarian: "Omnivore",
  eggetarian: "Eggetarian",
};

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_CALORIE_ADJUSTMENT: Record<string, number> = {
  fat_loss: -450,
  muscle_gain: 300,
  strength: 200,
  maintenance: 0,
  general_fitness: 0,
};

export interface DailyTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
  sleepHours: number;
  bmr: number | null;
}

// Server meal dates are stored as UTC calendar dates, so the client uses the same convention.
export function dateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function daysAgoKey(days: number): string {
  return dateKey(new Date(Date.now() - days * DAY_MS));
}

export function shortDate(value: unknown): string {
  if (typeof value !== "string") return String(value);
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
}

export function weekdayIndex(date: Date = new Date()): number {
  return (date.getDay() + 6) % 7;
}

export function greeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function computeTargets(profile: UserProfile | null): DailyTargets {
  const weight = profile?.weightKg ?? null;
  const height = profile?.heightCm ?? null;
  const age = profile?.age ?? null;
  let bmr: number | null = null;
  if (weight && height && age) {
    const genderOffset = profile?.gender === "female" ? -161 : 5;
    bmr = 10 * weight + 6.25 * height - 5 * age + genderOffset;
  }
  const multiplier = ACTIVITY_MULTIPLIERS[profile?.activityLevel ?? ""] ?? 1.45;
  const adjustment = GOAL_CALORIE_ADJUSTMENT[profile?.goal ?? ""] ?? 0;
  const calories = Math.round(((bmr ?? 1650) * multiplier + adjustment) / 10) * 10;
  const proteinPerKg = profile?.goal === "muscle_gain" || profile?.goal === "strength" ? 2 : 1.6;
  const protein = Math.round((weight ?? 70) * proteinPerKg);
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return {
    calories,
    protein,
    carbs,
    fat,
    waterMl: profile?.waterIntakeTargetMl ?? Math.round((weight ?? 70) * 35),
    sleepHours: profile?.sleepHoursTarget ?? 8,
    bmr: bmr === null ? null : Math.round(bmr),
  };
}

export function bmi(profile: UserProfile | null): number | null {
  if (!profile?.weightKg || !profile.heightCm) return null;
  const meters = profile.heightCm / 100;
  return profile.weightKg / (meters * meters);
}

export function sessionVolume(sets: Pick<WorkoutSet, "weightKg" | "reps">[]): number {
  return sets.reduce((sum, set) => sum + set.weightKg * set.reps, 0);
}

export function estimatedOneRepMax(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

export function completedSessions(sessions: WorkoutSessionSummary[]) {
  return sessions.filter((session) => session.completedAt);
}

// Consecutive days (ending today or yesterday) with at least one logged activity.
export function activityStreak(activeDates: Iterable<string>): number {
  const days = new Set(activeDates);
  let cursor = days.has(daysAgoKey(0)) ? 0 : 1;
  let streak = 0;
  while (days.has(daysAgoKey(cursor))) {
    streak += 1;
    cursor += 1;
  }
  return streak;
}

export interface PersonalRecord {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  weightKg: number;
  reps: number;
  estimatedMax: number;
  date: string;
}

export function personalRecords(sessions: WorkoutSessionSummary[]): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>();
  for (const session of sessions) {
    for (const set of session.sets) {
      const estimatedMax = estimatedOneRepMax(set.weightKg, set.reps);
      const current = best.get(set.exerciseId);
      if (!current || estimatedMax > current.estimatedMax) {
        best.set(set.exerciseId, {
          exerciseId: set.exerciseId,
          name: set.exercise?.name ?? "Exercise",
          muscleGroup: set.exercise?.muscleGroup ?? "other",
          weightKg: set.weightKg,
          reps: set.reps,
          estimatedMax,
          date: session.completedAt ?? session.startedAt,
        });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.estimatedMax - a.estimatedMax);
}

export function muscleGroupSplit(sessions: WorkoutSessionSummary[]) {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    for (const set of session.sets) {
      const group = set.exercise?.muscleGroup ?? "other";
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([group, sets]) => ({ group, sets }))
    .sort((a, b) => b.sets - a.sets);
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}
