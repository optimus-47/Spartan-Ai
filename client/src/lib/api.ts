const API_URL = (import.meta.env.VITE_API_URL ?? "https://spartan-ai.onrender.com")
  .replace(/\/+$/, "");
const API_BASE = `${API_URL}/api`;
const TOKEN_KEY = "spartan-token";
const NORMAL_TIMEOUT_MS = 25_000;
const AI_TIMEOUT_MS = 90_000;
const SLOW_REQUEST_MS = 6_000;
const SLOW_REQUEST_EVENT = "spartan:slow-request";
const GUEST_LIMIT_EVENT = "spartan:guest-limit";

export interface ApiError {
  message: string;
  code: string;
  status: number;
}

export class ApiRequestError extends Error implements ApiError {
  readonly code: string;
  readonly status: number;

  constructor({ message, code, status }: ApiError) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

export interface UserProfile {
  id: string;
  displayName: string | null;
  age: number | null;
  gender: string | null;
  heightCm: number | null;
  weightKg: number | null;
  bodyFatPct: number | null;
  activityLevel: string | null;
  goal: string | null;
  gymExperience: string | null;
  foodPreference: string | null;
  sleepHoursTarget: number | null;
  waterIntakeTargetMl: number | null;
}

export interface AppUser {
  id: string;
  email: string;
  isGuest?: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipmentRequired: string[];
  instructions: string | null;
  contraindicationTags: string[];
}

export interface CurrentUser {
  user: AppUser;
  profile: UserProfile | null;
}

export interface MealLogItem {
  id: string;
  foodId: string | null;
  foodName: string;
  quantityG: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isAiDetected: boolean;
  confidence: number | null;
}

export interface MealLog {
  id: string;
  logDate: string;
  mealSlot: string;
  items: MealLogItem[];
}

export interface MealLogSummary {
  mealLogs: MealLog[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface PlannedExercise {
  exerciseId: string;
  dayIndex: number;
  orderIndex: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRpe: number;
  name: string;
  muscleGroup: string;
  instructions: string | null;
}

export interface ActiveWorkoutPlan {
  id: string;
  goal: string | null;
  generatedAt: string;
  planJson: {
    splitType: string;
    days: Array<{
      dayIndex: number;
      label: string;
      isRestDay: boolean;
    }>;
    exercises: PlannedExercise[];
  };
}

export interface WeightTrendPoint {
  weightKg: number;
  recordedAt: string;
}

export interface CaloriesTrendPoint {
  date: string;
  calories: number;
}

export interface WorkoutSessionSummary {
  id: string;
  startedAt: string;
  completedAt: string | null;
  planId?: string | null;
  sets: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  setIndex: number;
  weightKg: number;
  reps: number;
  isPr: boolean;
  exercise: Pick<Exercise, "id" | "name" | "muscleGroup">;
}

export interface Food {
  id: string;
  name: string;
  cuisineTag: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
export type DietType = "vegetarian" | "vegan" | "non_vegetarian" | "eggetarian";

export interface DetectedFoodItem {
  detectedName: string;
  estimatedGrams: number;
  confidence: number;
  matchedFoodId: string | null;
  matchedFoodName: string | null;
}

export interface MealPlanMeal {
  mealSlot: MealSlot;
  foodId: string;
  quantityG: number;
  foodName: string;
  calories: number;
  protein: number;
}

export interface AiMealPlan {
  id: string;
  dietType: string | null;
  goal: string | null;
  generatedAt: string;
  generatedPlan: {
    dietType: string;
    days: Array<{ dayIndex: number; meals: MealPlanMeal[] }>;
  };
}

export interface FinishedSession {
  totalVolumeKg: number;
  prCount: number;
  setCount: number;
}

export interface UserDetails {
  equipment: Array<{ id: string; equipmentTag: string }>;
  injuries: Array<{ id: string; injuryTag: string; active: boolean }>;
}

interface RawCurrentUser {
  id: string;
  email: string;
  isGuest?: boolean;
  profile: UserProfile | null;
}

interface RawMealLogItem {
  id: string;
  foodId: string | null;
  foodNameSnapshot?: unknown;
  quantityG?: unknown;
  caloriesSnapshot?: unknown;
  proteinSnapshot?: unknown;
  carbsSnapshot?: unknown;
  fatSnapshot?: unknown;
  isAiDetected: boolean;
  confidence: number | null;
}

interface RawMealLog {
  id: string;
  logDate: string;
  mealSlot: string;
  items: RawMealLogItem[];
}

interface RawWorkoutPlan {
  id: string;
  goal: string | null;
  generatedAt: string;
  planJson: {
    splitType: string;
    days: ActiveWorkoutPlan["planJson"]["days"];
    exercises: Omit<PlannedExercise, "name" | "muscleGroup" | "instructions">[];
  };
}

interface RawApiError {
  error?: {
    code?: unknown;
    message?: unknown;
  };
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | object | null;
  timeoutMs?: number;
}

let exerciseCatalogRequest: Promise<Exercise[]> | null = null;

function announceSlowRequest(requestId: string, active: boolean): void {
  window.dispatchEvent(
    new CustomEvent(SLOW_REQUEST_EVENT, { detail: { requestId, active } }),
  );
}

function getErrorMessage(status: number, payload: RawApiError): string {
  const message = payload.error?.message;
  if (typeof message === "string" && message.trim()) return message;
  return `The request could not be completed (${status}).`;
}

function toApiError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiRequestError({
      message: "The request timed out. Please retry.",
      code: "REQUEST_TIMEOUT",
      status: 0,
    });
  }
  return new ApiRequestError({
    message: "Connection problem. Check your internet and retry.",
    code: "NETWORK_ERROR",
    status: 0,
  });
}

function createRequestBody(body: RequestOptions["body"]): BodyInit | null | undefined {
  if (
    body === null ||
    body === undefined ||
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }
  return JSON.stringify(body);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    body,
    headers: inputHeaders,
    timeoutMs: requestedTimeoutMs,
    ...init
  } = options;
  const method = (init.method ?? "GET").toUpperCase();
  const isAiRequest =
    method === "POST" &&
    (path === "/workouts/generate" ||
      path === "/nutrition/meals/scan" ||
      path === "/nutrition/meal-plans/generate");
  const timeoutMs = requestedTimeoutMs ?? (isAiRequest ? AI_TIMEOUT_MS : NORMAL_TIMEOUT_MS);
  const headers = new Headers(inputHeaders);
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const requestBody = createRequestBody(body);
  if (
    requestBody !== undefined &&
    requestBody !== null &&
    !(requestBody instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const maxAttempts = method === "GET" ? 2 : 1;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const requestId = crypto.randomUUID();
    const slowTimer = window.setTimeout(
      () => announceSlowRequest(requestId, true),
      SLOW_REQUEST_MS,
    );
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        body: requestBody,
        headers,
        signal: controller.signal,
      });
      const payload: unknown =
        response.status === 204 ? undefined : await response.json().catch(() => undefined);

      if (!response.ok) {
        const errorPayload =
          payload && typeof payload === "object" ? (payload as RawApiError) : {};
        const code =
          typeof errorPayload.error?.code === "string"
            ? errorPayload.error.code
            : "REQUEST_FAILED";
        const message = getErrorMessage(response.status, errorPayload);
        if (code === "GUEST_LIMIT") {
          window.dispatchEvent(
            new CustomEvent(GUEST_LIMIT_EVENT, { detail: { message } }),
          );
        }
        throw new ApiRequestError({
          status: response.status,
          code,
          message,
        });
      }
      return payload as T;
    } catch (error) {
      const normalizedError = toApiError(error);
      if (
        method === "GET" &&
        attempt === 0 &&
        normalizedError.code === "NETWORK_ERROR"
      ) {
        continue;
      }
      throw normalizedError;
    } finally {
      window.clearTimeout(slowTimer);
      window.clearTimeout(timeout);
      announceSlowRequest(requestId, false);
    }
  }

  throw new ApiRequestError({
    message: "Connection problem. Check your internet and retry.",
    code: "NETWORK_ERROR",
    status: 0,
  });
}

export const api = {
  async signup(email: string, password: string): Promise<AppUser> {
    return request<AppUser>("/auth/signup", {
      method: "POST",
      body: { email, password },
    });
  },

  async login(email: string, password: string): Promise<{ token: string; user: AppUser }> {
    const response = await request<{ token: string; user: AppUser }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    localStorage.setItem(TOKEN_KEY, response.token);
    return response;
  },

  async guestLogin(): Promise<{ token: string; user: AppUser }> {
    const response = await request<{ token: string; user: AppUser }>("/auth/guest", {
      method: "POST",
      timeoutMs: 60_000,
    });
    localStorage.setItem(TOKEN_KEY, response.token);
    return response;
  },

  async updateProfile(
    profile: Partial<Omit<UserProfile, "id">>,
  ): Promise<UserProfile> {
    return request<UserProfile>("/users/me/profile", {
      method: "PATCH",
      body: profile,
    });
  },

  async updateEquipment(equipmentTags: string[]): Promise<void> {
    await request("/users/me/equipment", {
      method: "PATCH",
      body: { equipmentTags },
    });
  },

  async addInjury(injuryTag: string): Promise<void> {
    await request("/users/me/injuries", {
      method: "POST",
      body: { injuryTag },
    });
  },

  async generateWorkoutPlan(
    splitType: string = "upper_lower",
  ): Promise<unknown> {
    return request("/workouts/generate", {
      method: "POST",
      body: { splitType },
    });
  },

  async getExercises(): Promise<Exercise[]> {
    if (!exerciseCatalogRequest) {
      exerciseCatalogRequest = request<Exercise[]>("/workouts/exercises");
    }

    const requestPromise = exerciseCatalogRequest;
    try {
      return await requestPromise;
    } catch (error) {
      if (exerciseCatalogRequest === requestPromise) {
        exerciseCatalogRequest = null;
      }
      throw error;
    }
  },

  async getMealsForDate(logDate: string): Promise<MealLogSummary> {
    const response = await request<{ mealLogs: RawMealLog[] }>(
      `/nutrition/meals?date=${encodeURIComponent(logDate)}`,
    );
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const mealLogs = response.mealLogs.map((log) => ({
      ...log,
      items: log.items.map((item) => {
        const calories = Number(item.caloriesSnapshot) || 0;
        const protein = Number(item.proteinSnapshot) || 0;
        const carbs = Number(item.carbsSnapshot) || 0;
        const fat = Number(item.fatSnapshot) || 0;
        totals.calories += calories;
        totals.protein += protein;
        totals.carbs += carbs;
        totals.fat += fat;

        return {
          id: item.id,
          foodId: item.foodId,
          foodName:
            typeof item.foodNameSnapshot === "string"
              ? item.foodNameSnapshot
              : "Unknown food",
          quantityG: Number(item.quantityG) || 0,
          calories,
          protein,
          carbs,
          fat,
          isAiDetected: item.isAiDetected,
          confidence: item.confidence,
        };
      }),
    }));

    return { mealLogs, totals };
  },

  async getWeightTrend(): Promise<WeightTrendPoint[]> {
    return request<WeightTrendPoint[]>("/analytics/weight-trend");
  },

  async getCaloriesTrend(): Promise<CaloriesTrendPoint[]> {
    return request<CaloriesTrendPoint[]>("/analytics/calories-trend");
  },

  async getWorkoutSessions(): Promise<WorkoutSessionSummary[]> {
    return request<WorkoutSessionSummary[]>("/workouts/sessions");
  },

  async getWorkoutSession(sessionId: string): Promise<WorkoutSessionSummary> {
    return request<WorkoutSessionSummary>(
      `/workouts/sessions/${encodeURIComponent(sessionId)}`,
    );
  },

  async startWorkoutSession(planId?: string): Promise<WorkoutSessionSummary> {
    return request<WorkoutSessionSummary>("/workouts/sessions", {
      method: "POST",
      body: planId ? { planId } : {},
    });
  },

  async logWorkoutSet(
    sessionId: string,
    set: { exerciseId: string; weightKg: number; reps: number },
  ): Promise<Omit<WorkoutSet, "exercise">> {
    return request<Omit<WorkoutSet, "exercise">>(
      `/workouts/sessions/${encodeURIComponent(sessionId)}/sets`,
      { method: "POST", body: set },
    );
  },

  async finishWorkoutSession(sessionId: string): Promise<FinishedSession> {
    return request<FinishedSession>(
      `/workouts/sessions/${encodeURIComponent(sessionId)}/finish`,
      { method: "POST" },
    );
  },

  async searchFoods(search: string): Promise<Food[]> {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    return request<Food[]>(`/nutrition/foods${query}`);
  },

  async logMeal(entry: {
    logDate: string;
    mealSlot: MealSlot;
    foodId: string;
    quantityG: number;
  }): Promise<void> {
    await request("/nutrition/meals", { method: "POST", body: entry });
  },

  async scanMeal(image: File): Promise<DetectedFoodItem[]> {
    const form = new FormData();
    form.append("image", image);
    const response = await request<{ detectedItems: DetectedFoodItem[] }>(
      "/nutrition/meals/scan",
      { method: "POST", body: form },
    );
    return response.detectedItems;
  },

  async confirmMealScan(entry: {
    logDate: string;
    mealSlot: MealSlot;
    items: Array<{
      foodId?: string;
      foodName?: string;
      quantityG: number;
      isAiDetected: boolean;
      confidence?: number;
    }>;
  }): Promise<void> {
    await request("/nutrition/meals/confirm", { method: "POST", body: entry });
  },

  async getLatestMealPlan(): Promise<AiMealPlan | null> {
    const response = await request<{ plan: AiMealPlan | null }>(
      "/nutrition/meal-plans/latest",
    );
    return response.plan;
  },

  async generateMealPlan(dietType: DietType, days: number): Promise<AiMealPlan> {
    return request<AiMealPlan>("/nutrition/meal-plans/generate", {
      method: "POST",
      body: { dietType, days },
    });
  },

  async addBodyMetric(weightKg: number): Promise<void> {
    await request("/users/me/body-metrics", {
      method: "POST",
      body: { weightKg },
    });
  },

  async getUserDetails(): Promise<UserDetails> {
    const raw = await request<Partial<UserDetails>>("/users/me");
    return { equipment: raw.equipment ?? [], injuries: raw.injuries ?? [] };
  },

  async getActiveWorkoutPlan(): Promise<ActiveWorkoutPlan | null> {
    let plan: RawWorkoutPlan;
    try {
      plan = await request<RawWorkoutPlan>("/workouts/plans/active");
    } catch (error) {
      if (
        isApiError(error) &&
        error.status === 404 &&
        error.code === "NO_ACTIVE_PLAN"
      ) {
        return null;
      }
      throw error;
    }

    const exercises = await api.getExercises();
    const exercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
    return {
      ...plan,
      planJson: {
        ...plan.planJson,
        exercises: plan.planJson.exercises.map((plannedExercise) => {
          const exercise = exercisesById.get(plannedExercise.exerciseId);
          if (!exercise) {
            throw new Error(
              `Exercise catalog is missing ${plannedExercise.exerciseId} from the active plan.`,
            );
          }
          return {
            ...plannedExercise,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            instructions: exercise.instructions,
          };
        }),
      },
    };
  },

  async verifyEmail(token: string): Promise<void> {
    await request<{ success: true }>(
      `/auth/verify-email/${encodeURIComponent(token)}`,
    );
  },

  async getCurrentUser(): Promise<CurrentUser> {
    const raw = await request<RawCurrentUser>("/users/me");
    return {
      user: { id: raw.id, email: raw.email, isGuest: raw.isGuest === true },
      profile: raw.profile,
    };
  },

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  hasToken(): boolean {
    return Boolean(localStorage.getItem(TOKEN_KEY));
  },
};

export function isApiError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

export function isSlowRequestEvent(event: Event): event is CustomEvent<{
  requestId: string;
  active: boolean;
}> {
  return event instanceof CustomEvent;
}

export const slowRequestEventName = SLOW_REQUEST_EVENT;
export const guestLimitEventName = GUEST_LIMIT_EVENT;
