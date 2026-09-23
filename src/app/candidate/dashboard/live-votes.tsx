"use client";

import { AnimatedCount } from "@/components/leaderboard/animated-number";
import { LiveStatus } from "@/components/leaderboard/live-status";
import { cn } from "@/lib/cn";
import { useLiveLeaderboard } from "@/lib/live-leaderboard";

/**
 * The hero number. While voting is open it follows the same WebSocket as
 * the public leaderboard, so a candidate watching this page sees each vote
 * land; before the first frame it shows the count the dashboard loaded.
 */
export function LiveVotes({
  candidateId,
  categoryId,
  contestId,
  votingOpen,
  initialTotal,
  initialRank,
  candidateCount,
}: {
  candidateId: string;
  categoryId: string;
  contestId: string;
  /** Decided on the server at request time: active and before ends_at. */
  votingOpen: boolean;
  initialTotal: number;
  initialRank: number | null;
  candidateCount: number;
}) {
  const live = votingOpen;
  // Closed contests do not change, so they do not open a socket.
  const { leaderboard, connected } = useLiveLeaderboard(live ? contestId : "", null);
  const category = leaderboard?.categories.find((c) => c.id === categoryId);
  const row = category?.candidates.find((c) => c.id === candidateId);
  const total = row?.vote_count ?? initialTotal;
  const rank = row ? row.rank : initialRank;
  const count = category ? category.candidates.filter((c) => c.status === "approved").length : candidateCount;

  return (
    <section className="flex flex-col items-center gap-1 rounded-lg border border-line bg-surface px-4 py-6 text-center">
      <AnimatedCount
        value={total}
        className={cn("font-display text-6xl font-semibold tabular-nums", live && connected ? "text-gold" : "text-ink")}
      />
      <p className="text-sm text-muted">
        {total === 1 ? "vote" : "votes"}
        {rank ? ` · #${rank} of ${count}` : ""}
      </p>
      <div className="mt-2">
        {!live ? <span className="text-sm font-medium text-muted">Voting closed</span> : <LiveStatus status="active" connected={connected} />}
      </div>
    </section>
  );
}
