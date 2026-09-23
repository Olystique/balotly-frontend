import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REFRESH_SECONDS,
  ROLE_COOKIE,
  accessMaxAge,
  cookieOptions,
} from "@/lib/session-cookies";
import type { AuthPayload } from "@/lib/types";

/**
 * Forward sign in or sign up to the backend. On success, put both tokens in
 * httpOnly cookies and return only the user; the tokens never reach the
 * browser's JavaScript. On failure, pass the backend's status and body
 * through untouched so the form can branch on the error code.
 */
export async function forwardAuth(path: string, request: Request): Promise<NextResponse> {
  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { detail: { code: "NETWORK_ERROR", message: "We couldn't reach the server. Check your connection and try again." } },
      { status: 502 },
    );
  }

  const body = await upstream.json().catch(() => null);
  if (!upstream.ok || !body?.data) {
    return NextResponse.json(body ?? { detail: { code: "UNKNOWN_ERROR", message: "Something went wrong." } }, {
      status: upstream.status,
    });
  }

  const data = body.data as AuthPayload;
  const response = NextResponse.json(
    { status_code: upstream.status, success: true, message: body.message, data: { user: data.user } },
    { status: upstream.status },
  );
  response.cookies.set(ACCESS_COOKIE, data.access_token, { ...cookieOptions, maxAge: accessMaxAge(data.access_token) });
  response.cookies.set(REFRESH_COOKIE, data.refresh_token, { ...cookieOptions, maxAge: REFRESH_SECONDS });
  response.cookies.set(ROLE_COOKIE, data.user.role, { ...cookieOptions, maxAge: REFRESH_SECONDS });
  return response;
}
