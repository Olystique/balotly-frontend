import { cn } from "@/lib/cn";
import type { CandidateStatus, ContestStatus, SettlementStatus } from "@/lib/types";

type Status = CandidateStatus | ContestStatus | SettlementStatus;

const labels: Record<Status, string> = {
  pending_approval: "Pending approval",
  approved: "Approved",
  disqualified: "Disqualified",
  draft: "Draft",
  active: "Active",
  closed: "Closed",
  held: "Held",
  released: "Released",
  reversed: "Withheld",
};

const tones: Record<Status, string> = {
  pending_approval: "border-line bg-surface text-muted",
  approved: "border-green/30 bg-green/10 text-green",
  disqualified: "border-red/30 bg-red/10 text-red",
  draft: "border-line bg-surface text-muted",
  active: "border-green/30 bg-green/10 text-green",
  closed: "border-line bg-paper text-ink",
  held: "border-line bg-surface text-muted",
  released: "border-green/30 bg-green/10 text-green",
  reversed: "border-red/30 bg-red/10 text-red",
};

/** One status, one look, everywhere it appears. */
export function StatusPill({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        tones[status],
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}
