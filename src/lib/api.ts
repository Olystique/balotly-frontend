/**
 * The one place that knows the API base URL and the response envelope.
 *
 * Success bodies are `{ status_code, success, message, data }`; this returns
 * `data`. Failures are `{ detail: { code, message } }`; this throws
 * `ApiError` so screens can branch on `code`.
 */
const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001/api/v1";

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
}

interface Envelope<T> {
  status_code: number;
  success: boolean;
  message: string;
  data?: T;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
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
    throw new ApiError(0, "NETWORK_ERROR", "We could not reach the server. Check your connection and try again.");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = body?.detail;
    if (detail && typeof detail === "object" && "code" in detail) {
      throw new ApiError(response.status, detail.code, detail.message, detail);
    }
    if (response.status === 422) {
      throw new ApiError(422, "VALIDATION_ERROR", "Some of the details need fixing.", detail);
    }
    throw new ApiError(response.status, "UNKNOWN_ERROR", "Something went wrong on our side.", detail);
  }

  return (body as Envelope<T>).data as T;
}
