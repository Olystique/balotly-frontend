import Link from "next/link";
import { formatDateTime } from "@/lib/format";

/**
 * The page when there is no vote to cast. Each case is a different thing for
 * the voter to understand, so each gets its own words rather than one
 * generic error box.
 */
type Reason =
  | { code: "CANDIDATE_NOT_FOUND" }
  | { code: "CANDIDATE_DISQUALIFIED"; name?: string }
  | { code: "VOTING_NOT_OPEN"; startsAt?: string }
  | { code: "VOTING_CLOSED"; contestId?: string }
  | { code: "NETWORK_ERROR" };

export function Unavailable(reason: Reason) {
  return (
    <div className="flex flex-col gap-3 py-10 text-center">
      <Body {...reason} />
    </div>
  );
}

function Body(reason: Reason) {
  switch (reason.code) {
    case "CANDIDATE_DISQUALIFIED":
      return (
        <>
          <h1 className="text-2xl">{reason.name ?? "This candidate"} has been disqualified</h1>
          <p className="text-muted">
            {reason.name ?? "This candidate"} has been disqualified from this contest. Votes can no
            longer be cast for them.
          </p>
        </>
      );
    case "VOTING_NOT_OPEN":
      return (
        <>
          <h1 className="text-2xl">Voting hasn&apos;t opened yet</h1>
          {reason.startsAt && (
            <p className="text-muted">
              Opens <span className="font-semibold text-ink">{formatDateTime(reason.startsAt)}</span>.
              Come back to this link then.
            </p>
          )}
        </>
      );
    case "VOTING_CLOSED":
      return (
        <>
          <h1 className="text-2xl">Voting has closed for this contest</h1>
          {reason.contestId && (
            <Link
              href={`/contests/${reason.contestId}/leaderboard`}
              className="inline-flex min-h-tap items-center justify-center font-semibold text-green underline underline-offset-4"
            >
              See the final results
            </Link>
          )}
        </>
      );
    case "NETWORK_ERROR":
      return (
        <>
          <h1 className="text-2xl">We couldn&apos;t load this page</h1>
          <p className="text-muted">Check your connection and pull to refresh.</p>
        </>
      );
    default:
      return (
        <>
          <h1 className="text-2xl">We couldn&apos;t find that candidate</h1>
          <p className="text-muted">Check the link you were sent.</p>
        </>
      );
  }
}
