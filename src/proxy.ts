import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  ROLE_COOKIE,
  accessMaxAge,
  cookieOptions,
  homeFor,
  PATH_HEADER,
} from "@/lib/session-cookies";
import { refreshAccessToken } from "@/lib/refresh";

/**
 * Runs before /candidate, /organizer, /api/backend and the sign in pages.
 *
 * 1. The access cookie expires a minute before its token does. When it is
 *    gone and a refresh cookie is present, refresh once here, write the new
 *    cookie on the response for the browser and on the request for this
 *    render, so pages and route handlers only ever see a valid token.
 * 2. Signed out on a dashboard route: go to sign in, remembering where.
 * 3. Signed in on sign in or sign up: go to your home.
 *
 * Voter routes (/vote, /contests) are not matched and never will be.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  let refreshedToken: string | null = null;
  let refreshFailed = false;

  if (!access && refresh) {
    refreshedToken = await refreshAccessToken(refresh);
    if (refreshedToken) {
      access = refreshedToken;
      request.cookies.set(ACCESS_COOKIE, refreshedToken);
    } else {
      refreshFailed = true;
    }
  }

  const isDashboard = /^\/(candidate|organizer)(\/|$)/.test(pathname);
  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";
  const isBackend = pathname.startsWith("/api/backend/");

  let response: NextResponse;
  if (isDashboard && !access) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", pathname + search);
    response = NextResponse.redirect(url);
  } else if (isBackend && !access) {
    response = NextResponse.json(
      { detail: { code: "UNAUTHENTICATED", message: "Please sign in again." } },
      { status: 401 },
    );
  } else if (isAuthPage && access) {
    response = NextResponse.redirect(new URL(homeFor(request.cookies.get(ROLE_COOKIE)?.value), request.url));
  } else {
    // Server components cannot read the URL, but the expired session
    // redirect needs to know where to come back to.
    request.headers.set(PATH_HEADER, pathname + search);
    response = NextResponse.next({ request: { headers: request.headers } });
  }

  if (refreshedToken) {
    response.cookies.set(ACCESS_COOKIE, refreshedToken, { ...cookieOptions, maxAge: accessMaxAge(refreshedToken) });
  }
  if (refreshFailed) {
    response.cookies.delete(REFRESH_COOKIE);
    response.cookies.delete(ROLE_COOKIE);
  }
  return response;
}

export const config = {
  matcher: ["/candidate/:path*", "/organizer/:path*", "/api/backend/:path*", "/sign-in", "/sign-up"],
};
