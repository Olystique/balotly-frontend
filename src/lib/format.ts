/**
 * Dates, times and counts, formatted once for the whole app.
 *
 * Times are shown in Lagos time. Every contest so far is in Nigeria, and a
 * voter on a phone set to another zone would otherwise see a deadline an
 * hour off from what the organizer announced.
 */
const TIME_ZONE = "Africa/Lagos";

const dateTime = new Intl.DateTimeFormat("en-NG", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  // en-NG defaults to a 24 hour clock without a leading zero, so 07:33
  // would print as "7:33" and read as ambiguous. Say am or pm.
  hour12: true,
});

const dateOnly = new Intl.DateTimeFormat("en-NG", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const count = new Intl.NumberFormat("en-NG");

/** "Mon, 5 Oct, 6:00 pm" */
export function formatDateTime(isoString: string): string {
  return dateTime.format(new Date(isoString));
}

/** "5 Oct 2026" */
export function formatDate(isoString: string): string {
  return dateOnly.format(new Date(isoString));
}

/** "4,812" */
export function formatCount(n: number): string {
  return count.format(n);
}

/** "1 vote", "5 votes" */
export function votesLabel(n: number): string {
  return `${formatCount(n)} ${n === 1 ? "vote" : "votes"}`;
}

/** "2 hours ago", "just now". Coarse on purpose; it is a hint, not a record. */
export function timeAgo(isoString: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(isoString)) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * A datetime-local value ("2026-10-01T08:00") is wall clock time with no
 * zone. Every time in the product is shown in Lagos time, so it is read as
 * Lagos time too, whatever zone the organizer's phone is set to. Nigeria has
 * no daylight saving, so the offset is always +01:00.
 */
export function lagosInputToIso(value: string): string {
  return new Date(`${value}:00+01:00`).toISOString();
}
