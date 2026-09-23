import { NextResponse, type NextRequest } from "next/server";
import { API_BASE_URL } from "@/lib/api";
import { refreshAccessToken } from "@/lib/refresh";
import { ACCESS_COOKIE, REFRESH_COOKIE, accessMaxAge, cookieOptions } from "@/lib/session-cookies";

/**
 * Authenticated pass through for browser code: `/api/backend/x` calls the
 * backend's `/x` with the user's token from the httpOnly cookie.
 *
 * One route rather than one per screen. The token is the thing to keep out
 * of the browser; which endpoints the user may call is the backend's job,
 * and it checks every one. Mutations must come from this site (Origin
 * check), so another site cannot ride the cookie.
 *
 * A 401 with a token in hand means the backend stopped accepting it early.
 * Refresh once and retry, so a screen never breaks over a token swap.
 */
async function forward(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (request.method !== "GET" && !sameOrigin(request)) {
    return NextResponse.json(
      { detail: { code: "FORBIDDEN", message: "You do not have access to this." } },
      { status: 403 },
    );
  }

  const { path } = await params;
  const target = `${API_BASE_URL}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  const contentType = request.headers.get("content-type");

  const call = (token: string | undefined) => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (contentType) headers["Content-Type"] = contentType;
    return fetch(target, { method: request.method, headers, body, cache: "no-store" });
  };

  let upstream: Response;
  let refreshed: string | null = null;
  try {
    const token = request.cookies.get(ACCESS_COOKIE)?.value;
    upstream = await call(token);
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (upstream.status === 401 && token && refreshToken) {
      refreshed = await refreshAccessToken(refreshToken);
      if (refreshed) upstream = await call(refreshed);
    }
  } catch {
    return NextResponse.json(
      { detail: { code: "NETWORK_ERROR", message: "We couldn't reach the server. Check your connection and try again." } },
      { status: 502 },
    );
  }

  const raw = upstream.status === 204 ? null : await upstream.arrayBuffer();
  const { body: responseBody, issuedToken } = liftToken(raw, upstream.headers.get("content-type"));
  const response = new NextResponse(responseBody, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
  const token = issuedToken ?? refreshed;
  if (token) {
    response.cookies.set(ACCESS_COOKIE, token, { ...cookieOptions, maxAge: accessMaxAge(token) });
  }
  return response;
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export { forward as GET, forward as POST, forward as PATCH, forward as DELETE };

/**
 * Some endpoints hand back a fresh access token (creating an organization
 * does, BE-03, so the token carries the new organization id). It goes into
 * the httpOnly cookie and is removed from the body, so no token ever reaches
 * browser JavaScript whichever endpoint issued it.
 */
function liftToken(raw: ArrayBuffer | null, contentType: string | null): { body: ArrayBuffer | string | null; issuedToken: string | null } {
  if (!raw || !contentType?.includes("application/json")) return { body: raw, issuedToken: null };
  let parsed: { data?: Record<string, unknown> };
  try {
    parsed = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return { body: raw, issuedToken: null };
  }
  const token = parsed?.data?.access_token;
  if (typeof token !== "string") return { body: raw, issuedToken: null };
  delete parsed.data!.access_token;
  delete parsed.data!.refresh_token;
  return { body: JSON.stringify(parsed), issuedToken: token };
}
