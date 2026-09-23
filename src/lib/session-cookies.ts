/**
 * Cookie names and lifetimes for the session. Shared by the proxy, the auth
 * route handlers and server components, so all three agree.
 *
 * All three cookies are httpOnly. The role cookie only decides where a
 * signed in user lands; nothing trusts it for access, the backend checks the
 * token on every call.
 */
export const ACCESS_COOKIE = "balotly_access";
export const REFRESH_COOKIE = "balotly_refresh";
export const ROLE_COOKIE = "balotly_role";

/** Request header the proxy sets with the current path, for the expired session redirect. */
export const PATH_HEADER = "x-balotly-path";

const DEFAULT_ACCESS_SECONDS = 30 * 60;
export const REFRESH_SECONDS = 7 * 24 * 60 * 60;

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Seconds until a JWT expires, less a minute of margin, so the browser drops
 * the cookie just before the backend would refuse the token. Falls back to
 * the backend's default lifetime for a token that is not a JWT.
 */
export function accessMaxAge(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload.exp === "number") {
      return Math.max(0, Math.floor(payload.exp - Date.now() / 1000) - 60);
    }
  } catch {
    // Not a JWT; use the default.
  }
  return DEFAULT_ACCESS_SECONDS - 60;
}

export function homeFor(role: string | undefined): string {
  return role === "organizer" || role === "admin" ? "/organizer" : "/candidate";
}

/** Only follow `next` if it is a path on this site. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}
