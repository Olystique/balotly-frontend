/**
 * The one place that knows the API base URL and the response envelope.
 *
 * Success bodies are `{ status_code, success, message, data }`; this returns
 * `data`. Failures are `{ detail: { code, message } }`; this throws
 * `ApiError` so screens can branch on `code`.
 *
 * Browser code calls public endpoints (`/vote`, leaderboards) directly, and
 * authenticated ones through `bff()`, which goes via this app's own
 * `/api/backend` route so the token never reaches JavaScript.
 */
// `||`, not `??`: a variable copied from .env.example and left blank is an
// empty string, and an empty base URL would send requests to this app.
export const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8001/api/v1";

const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: unknown;

  constructor(status: number, code: string, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }

  /** A field from the error detail, such as `starts_at` on VOTING_NOT_OPEN. */
  field(name: string): string | undefined {
    const value = (this.detail as Record<string, unknown> | undefined)?.[name];
    return typeof value === "string" ? value : undefined;
  }

  /** Field errors from a FastAPI 422, keyed by field name. */
  fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.detail)) return {};
    const out: Record<string, string> = {};
    for (const item of this.detail as Array<{ loc?: unknown[]; msg?: string }>) {
      const field = item.loc?.[item.loc.length - 1];
      if (typeof field === "string" && item.msg) out[field] = item.msg;
    }
    return out;
  }
}

export const NETWORK_MESSAGE = "We couldn't reach the server. Check your connection and try again.";

interface Envelope<T> {
  status_code: number;
  success: boolean;
  message: string;
  data?: T;
}

export async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", NETWORK_MESSAGE);
  }

  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = body?.detail;
    if (detail && typeof detail === "object" && !Array.isArray(detail) && "code" in detail) {
      throw new ApiError(response.status, detail.code, detail.message, detail);
    }
    if (response.status === 422) {
      throw new ApiError(422, "VALIDATION_ERROR", "Some of the details need fixing.", detail);
    }
    throw new ApiError(response.status, "UNKNOWN_ERROR", "Something went wrong on our side. Please try again.", detail);
  }

  return (body as Envelope<T>).data as T;
}

/** Public endpoints, from the server or the browser. */
export function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = typeof window === "undefined" ? API_BASE_URL : PUBLIC_BASE_URL;
  return request<T>(`${base}${path}`, init);
}

/** Authenticated endpoints from the browser, through this app's proxy route. */
export function bff<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(`/api/backend${path}`, init);
}

/** JSON body helper so call sites stay short. */
export function json(method: string, body?: unknown): RequestInit {
  return { method, body: body === undefined ? undefined : JSON.stringify(body) };
}
