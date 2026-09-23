"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { StatusPill } from "@/components/ui/status-pill";
import { ApiError, NETWORK_MESSAGE, bff, json } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import type { ReleaseResult, SettlementRow, Settlements } from "@/lib/types";

const BLOCKED: Record<string, string> = {
  no_verified_bank_account: "no bank account linked",
  nothing_to_pay: "nothing to pay",
  disqualified: "disqualified",
};

/** "1 day 4 hours", for the time left before release is allowed. */
function untilLabel(ms: number): string {
  const hours = Math.max(0, Math.ceil(ms / 3_600_000));
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  if (days && rest) return `${days} day${days === 1 ? "" : "s"} ${rest} hour${rest === 1 ? "" : "s"}`;
  if (days) return `${days} day${days === 1 ? "" : "s"}`;
  return `${rest || 1} hour${rest === 1 || !rest ? "" : "s"}`;
}

export function SettlementScreen({ data }: { data: Settlements }) {
  const router = useRouter();
  const { contest, totals, settlements } = data;
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReleaseResult | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const availableAt = contest.release_available_at ? Date.parse(contest.release_available_at) : null;
  const windowOpen = availableAt !== null && now < availableAt;
  const canRelease = contest.status === "closed" && !windowOpen && totals.releasable_candidates > 0;
  const nameOf = (id: string) => settlements.find((s) => s.candidate.id === id)?.candidate.name ?? "A candidate";

  const held = settlements.filter((s) => s.status === "held" && s.blocked_reason !== "disqualified");
  const disqualified = settlements.filter((s) => s.status === "reversed" || s.blocked_reason === "disqualified");
  const released = settlements.filter((s) => s.status === "released");

  async function release() {
    setReleasing(true);
    setError(null);
    try {
      const outcome = await bff<ReleaseResult>(`/organizer/contests/${encodeURIComponent(contest.id)}/settlements/release`, json("POST"));
      setResult(outcome);
      setConfirming(false);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.code === "DISPUTE_WINDOW_OPEN") {
        const at = e.field("release_available_at");
        setError(`The dispute window is still open${at ? `. Release is available from ${formatDateTime(at)}` : ""}.`);
      } else if (e instanceof ApiError && e.code === "CONTEST_NOT_CLOSED") {
        setError("Voting is still open. Close the contest before releasing funds.");
      } else if (e instanceof ApiError && e.code === "NOTHING_TO_RELEASE") {
        setError("There is nothing left to release.");
        router.refresh();
      } else {
        setError(e instanceof ApiError && e.code !== "NETWORK_ERROR" ? e.message : `${NETWORK_MESSAGE} Nothing was released that we know of; reload before trying again.`);
      }
      setConfirming(false);
    } finally {
      setReleasing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link href={`/organizer/contests/${contest.id}`} className="text-sm text-muted underline-offset-4 hover:underline">
          {contest.name}
        </Link>
        <h1 className="text-3xl">Settlement</h1>
        <p className="text-sm text-muted">
          {contest.status !== "closed"
            ? "Voting is still open. Settlement starts when the contest is closed."
            : `Closed ${contest.closed_at ? formatDateTime(contest.closed_at) : ""} · Release available from ${
                contest.release_available_at ? formatDateTime(contest.release_available_at) : "now"
              }`}
        </p>
      </header>

      <dl className="grid grid-cols-3 gap-2">
        <Total label="Held" value={totals.held_kobo} />
        <Total label="Released" value={totals.released_kobo} tone="green" />
        <Total label="Withheld" value={totals.reversed_kobo} tone="red" />
      </dl>

      {result && <ResultPanel result={result} nameOf={nameOf} onRetry={() => setConfirming(true)} />}
      {error && <Notice tone="error">{error}</Notice>}

      {contest.status === "closed" && (
        <div className="flex flex-col gap-2">
          <Button onClick={() => setConfirming(true)} disabled={!canRelease}>
            {totals.releasable_candidates > 0
              ? `Release ${formatNaira(totals.releasable_kobo)} to ${totals.releasable_candidates} ${totals.releasable_candidates === 1 ? "candidate" : "candidates"}`
              : "Nothing to release"}
          </Button>
          {windowOpen && availableAt && (
            <p className="text-center text-sm text-muted">Available in {untilLabel(availableAt - now)}, after the dispute window.</p>
          )}
        </div>
      )}

      {held.length > 0 && (
        <Group title="Candidates">
          {held.map((s) => (
            <Row key={s.id} row={s} note={s.releasable ? null : s.blocked_reason ? BLOCKED[s.blocked_reason] : null} />
          ))}
        </Group>
      )}
      {disqualified.length > 0 && (
        <Group title="Disqualified" hint="Not included in any release.">
          {disqualified.map((s) => (
            <Row key={s.id} row={s} note="disqualified" muted />
          ))}
        </Group>
      )}
      {released.length > 0 && (
        <Group title="Released">
          {released.map((s) => (
            <Row
              key={s.id}
              row={s}
              note={`${s.actioned_at ? formatDate(s.actioned_at) : ""}${s.provider_reference ? ` · ${s.provider_reference}` : ""}`}
            />
          ))}
        </Group>
      )}

      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Release ${formatNaira(totals.releasable_kobo)} to ${totals.releasable_candidates} ${totals.releasable_candidates === 1 ? "candidate" : "candidates"}?`}
        locked={releasing}
      >
        <p className="text-sm text-muted">
          This sends money to each candidate&apos;s bank account and cannot be undone. Disqualified candidates are not included.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={release} loading={releasing}>
            Yes, release {formatNaira(totals.releasable_kobo)}
          </Button>
          {releasing ? (
            <p className="text-center text-sm text-muted">Releasing… this can take a minute. Keep this page open.</p>
          ) : (
            <button type="button" onClick={() => setConfirming(false)} className="min-h-tap text-sm font-semibold underline underline-offset-4">
              Cancel
            </button>
          )}
        </div>
      </Sheet>
    </div>
  );
}

function Total({ label, value, tone }: { label: string; value: number; tone?: "green" | "red" }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg border border-line bg-surface px-3 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn("truncate font-display text-lg font-semibold tabular-nums", tone === "green" && "text-green", tone === "red" && "text-red")}>
        {formatNaira(value)}
      </dd>
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="text-lg">{title}</h2>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">{children}</ul>
    </section>
  );
}

function Row({ row, note, muted = false }: { row: SettlementRow; note: string | null; muted?: boolean }) {
  const excluded = row.status === "held" && !row.releasable;
  return (
    <li className={cn("flex items-center justify-between gap-3 px-4 py-3", (muted || excluded) && "text-muted")}>
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{row.candidate.name}</span>
        {note && <span className={cn("text-xs", note === "disqualified" ? "font-semibold text-red" : "text-muted")}>{note}</span>}
        {row.failure_reason && row.status === "held" && <span className="text-xs text-red">Last attempt failed: {row.failure_reason}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-display font-semibold tabular-nums">{formatNaira(row.amount_kobo)}</span>
        <StatusPill status={row.status} />
      </span>
    </li>
  );
}

function ResultPanel({ result, nameOf, onRetry }: { result: ReleaseResult; nameOf: (id: string) => string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-green/40 bg-surface px-4 py-4" role="status">
      <p className="font-semibold">
        Released to {result.released} {result.released === 1 ? "candidate" : "candidates"} · {formatNaira(result.released_kobo)}
      </p>
      {result.reversed > 0 && <p className="text-sm">{result.reversed} withheld (disqualified)</p>}
      {result.skipped.map((s) => (
        <p key={s.candidate_id} className="text-sm text-muted">
          Skipped: {nameOf(s.candidate_id)}, {BLOCKED[s.reason] ?? s.reason.replace(/_/g, " ")}
        </p>
      ))}
      {result.failed.map((f) => (
        <p key={f.candidate_id} className="text-sm text-red">
          Failed: {nameOf(f.candidate_id)}, &ldquo;{f.reason}&rdquo;
        </p>
      ))}
      {result.failed.length > 0 && (
        <Button variant="secondary" onClick={onRetry}>
          Retry failed
        </Button>
      )}
    </div>
  );
}
