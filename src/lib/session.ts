import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { API_BASE_URL, ApiError, request } from "@/lib/api";
import { ACCESS_COOKIE, PATH_HEADER, homeFor } from "@/lib/session-cookies";
import type { Role, User } from "@/lib/types";

/**
 * Server side calls to authenticated endpoints, as the signed in user.
 *
 * The proxy has already refreshed an expired access token by the time a
 * page renders, so this only reads the cookie. A 401 here means the session
 * is really over.
 */
export async function serverApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in again.");
  return request<T>(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
}

/** The signed in user, or null. Fetched once per request. */
export const getSession = cache(async (): Promise<User | null> => {
  try {
    const { user } = await serverApi<{ user: User }>("/auth/me");
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

/**
 * The backend refused a cookie the browser still holds (a rotated secret, a
 * clock that disagrees). Sending the user to sign in would loop, because the
 * proxy sees the cookie and sends them back. So drop the cookie in a route
 * handler and return here; the proxy then refreshes or signs them out.
 */
async function sessionExpired(): Promise<never> {
  const path = (await headers()).get(PATH_HEADER) ?? "/";
  redirect(`/api/auth/expired?next=${encodeURIComponent(path)}`);
}

/**
 * For layouts under /candidate and /organizer: the user, or a redirect.
 * Signed out goes to sign in; the wrong role goes to that role's home.
 */
export async function requireUser(...roles: Role[]): Promise<User> {
  const user = await getSession();
  if (!user) return sessionExpired();
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

/**
 * Run a server side fetch and turn a 401 into a redirect to sign in. Every
 * other error is returned for the page to render.
 */
export async function load<T>(path: string): Promise<{ data: T; error: null } | { data: null; error: ApiError }> {
  try {
    return { data: await serverApi<T>(path), error: null };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) return sessionExpired();
      return { data: null, error };
    }
    throw error;
  }
}
