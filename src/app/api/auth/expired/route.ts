import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, safeNext } from "@/lib/session-cookies";

/**
 * Drop an access cookie the backend no longer accepts and go back where the
 * user was. The proxy then sees no access cookie: it refreshes if the
 * refresh cookie is still good, or sends the user to sign in if not.
 */
export function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next")) ?? "/";
  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.delete(ACCESS_COOKIE);
  return response;
}
