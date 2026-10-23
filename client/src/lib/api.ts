const API_URL = (import.meta.env.VITE_API_URL ?? "https://spartan-ai.onrender.com")
  .replace(/\/+$/, "");
const API_BASE = `${API_URL}/api`;
const TOKEN_KEY = "spartan-token";
const NORMAL_TIMEOUT_MS = 25_000;
const SLOW_REQUEST_MS = 5_000;
const SLOW_REQUEST_EVENT = "spartan:slow-request";

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
}

export interface CurrentUser {
  user: AppUser;
  profile: UserProfile | null;
}

interface RawCurrentUser {
  id: string;
  email: string;
  profile: UserProfile | null;
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
    timeoutMs = NORMAL_TIMEOUT_MS,
    ...init
  } = options;
  const method = (init.method ?? "GET").toUpperCase();
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
        throw new ApiRequestError({
          status: response.status,
          code:
            typeof errorPayload.error?.code === "string"
              ? errorPayload.error.code
              : "REQUEST_FAILED",
          message: getErrorMessage(response.status, errorPayload),
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
    const response = await request<{ user: AppUser }>("/auth/signup", {
      method: "POST",
      body: { email, password },
    });
    return response.user;
  },

  async login(email: string, password: string): Promise<{ token: string; user: AppUser }> {
    const response = await request<{ token: string; user: AppUser }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    localStorage.setItem(TOKEN_KEY, response.token);
    return response;
  },

  async verifyEmail(token: string): Promise<void> {
    await request<{ success: true }>(
      `/auth/verify-email/${encodeURIComponent(token)}`,
    );
  },

  async getCurrentUser(): Promise<CurrentUser> {
    const raw = await request<RawCurrentUser>("/users/me");
    return {
      user: { id: raw.id, email: raw.email },
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
