import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, ROLE_COOKIE } from "@/lib/session-cookies";

/** Clear the session and go to sign in. A form post, so it works without JavaScript. */
export function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/sign-in", request.url), 303);
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, ROLE_COOKIE]) response.cookies.delete(name);
  return response;
}
