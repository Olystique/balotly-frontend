import { API_BASE_URL } from "@/lib/api";

/** Trade a refresh token for a new access token, or null if the session is over. */
export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body?.data?.access_token === "string" ? body.data.access_token : null;
  } catch {
    return null;
  }
}
