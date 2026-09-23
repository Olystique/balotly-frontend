import type { TransactionStatus } from "@/lib/types";

/**
 * What the confirmation page shows, decided only from what the backend
 * said. The redirect back from Paystack means the voter finished the
 * payment screen; it does not mean the vote counted. Only the webhook
 * credits a vote, so only `status: "success"` from the API may show success.
 */
export type Phase = "confirming" | "success" | "failed" | "timeout" | "missing";

export const POLL_INTERVAL_MS = 2000;
export const POLL_WINDOW_MS = 90_000;

export function phaseFor(status: TransactionStatus | null, waitedMs: number): Phase {
  if (status === "success") return "success";
  if (status === "failed") return "failed";
  if (waitedMs >= POLL_WINDOW_MS) return "timeout";
  return "confirming";
}

/** Keep polling only while there is still an answer to wait for. */
export function shouldPoll(phase: Phase): boolean {
  return phase === "confirming";
}
