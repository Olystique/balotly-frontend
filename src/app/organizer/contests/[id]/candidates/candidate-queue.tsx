"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { TimeAgo } from "@/components/ui/time-ago";
import { ApiError, NETWORK_MESSAGE, bff, json } from "@/lib/api";
import { cn } from "@/lib/cn";
import { downloadFile } from "@/lib/download";
import { formatDate } from "@/lib/format";
import type { Candidate, CandidateStatus, Category } from "@/lib/types";

const TABS: Array<{ status: CandidateStatus; label: string }> = [
  { status: "pending_approval", label: "Pending" },
  { status: "approved", label: "Approved" },
  { status: "disqualified", label: "Disqualified" },
];

const MIN_REASON = 5;

export function CandidateQueue({ candidates: initial, categories }: { candidates: Candidate[]; categories: Category[] }) {
  const router = useRouter();
  const [candidates, setCandidates] = useState(initial);
  const [tab, setTab] = useState<CandidateStatus>(initial.some((c) => c.status === "pending_approval") ? "pending_approval" : "approved");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [justApproved, setJustApproved] = useState<string | null>(null);
  const [disqualifying, setDisqualifying] = useState<Candidate | null>(null);
  // Shown above the list, not on the row: after the refresh the row has
  // usually moved to another tab, and a message on it would never be seen.
  const [handledElsewhere, setHandledElsewhere] = useState(false);

  // Fresh server data (after a refresh) replaces local state.
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    setCandidates(initial);
  }

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const counts = useMemo(() => {
    const out: Record<CandidateStatus, number> = { pending_approval: 0, approved: 0, disqualified: 0 };
    candidates.forEach((c) => out[c.status]++);
    return out;
  }, [candidates]);
  const visible = candidates.filter((c) => c.status === tab && (!categoryId || c.category_id === categoryId));

  // Posters render in the background after approval; refresh until they exist.
  const waitingForPoster = candidates.some((c) => c.status === "approved" && !c.poster_url);
  useEffect(() => {
    if (!waitingForPoster) return;
    const timer = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(timer);
  }, [waitingForPoster, router]);

  function replace(updated: Candidate) {
    setCandidates((list) => list.map((c) => (c.id === updated.id ? updated : c)));
  }

  function explain(e: unknown): string {
    if (e instanceof ApiError && e.code === "INVALID_STATUS_TRANSITION") {
      setHandledElsewhere(true);
      router.refresh();
      return "This application was already handled.";
    }
    return e instanceof ApiError && e.code !== "NETWORK_ERROR" ? e.message : NETWORK_MESSAGE;
  }

  async function approve(candidate: Candidate) {
    setBusy(candidate.id);
    setRowError(null);
    setHandledElsewhere(false);
    const before = candidate;
    replace({ ...candidate, status: "approved" }); // optimistic, rolled back on error
    try {
      const { candidate: updated } = await bff<{ candidate: Candidate }>(`/candidates/${encodeURIComponent(candidate.id)}/approve`, json("PATCH"));
      replace(updated);
      setJustApproved(updated.id);
      setTimeout(() => setJustApproved(null), 1500);
    } catch (e) {
      replace(before);
      const message = explain(e);
      if (!(e instanceof ApiError && e.code === "INVALID_STATUS_TRANSITION")) setRowError({ id: candidate.id, message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.status}
            role="tab"
            type="button"
            aria-selected={tab === t.status}
            onClick={() => setTab(t.status)}
            className={cn(
              "flex min-h-tap flex-col items-center justify-center rounded-md px-1 py-1.5 text-sm font-medium",
              tab === t.status ? "bg-ink text-surface" : "text-ink",
            )}
          >
            <span>{t.label}</span>
            <span className="font-display text-base font-semibold tabular-nums opacity-80">{counts[t.status]}</span>
          </button>
        ))}
      </div>

      {categories.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <Chip active={!categoryId} onClick={() => setCategoryId(null)}>All categories</Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
              {c.name}
            </Chip>
          ))}
        </div>
      )}

      {handledElsewhere && (
        <Notice tone="info">This application was already handled by someone else. The list is up to date now.</Notice>
      )}

      {visible.length === 0 && (
        <p className="py-8 text-center text-muted">
          {tab === "pending_approval"
            ? "No applications waiting. Share the application link from the contest page."
            : tab === "approved"
              ? "No approved candidates yet."
              : "No one has been disqualified."}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {visible.map((c) => (
          <li
            key={c.id}
            className={cn(
              "flex flex-col gap-3 rounded-lg border bg-surface px-4 py-4 transition-colors duration-700",
              justApproved === c.id ? "border-green" : "border-line",
              c.status === "disqualified" && "opacity-75",
            )}
          >
            <div className="flex items-start gap-3">
              <Avatar src={c.photo_url} name={c.name} size={48} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold break-words">{c.name}</span>
                <span className="text-sm text-muted">
                  {categoryName.get(c.category_id) ?? "Candidate"}
                  {c.matric_number ? ` · ${c.matric_number}` : ""}
                </span>
                {c.status === "pending_approval" && (
                  <span className="text-xs text-muted">
                    applied <TimeAgo iso={c.created_at} />
                  </span>
                )}
              </div>
            </div>

            {c.status === "pending_approval" && c.bio && <Bio text={c.bio} />}
            {c.status === "approved" && <ApprovedDetails candidate={c} />}
            {c.status === "disqualified" && (
              <p className="text-sm">
                <span className="font-semibold text-red">Disqualified {formatDate(c.updated_at)}.</span> {c.disqualification_reason}
              </p>
            )}

            {rowError?.id === c.id && <Notice tone="error">{rowError.message}</Notice>}

            {c.status === "pending_approval" && (
              <div className="flex items-center gap-4">
                <Button onClick={() => approve(c)} loading={busy === c.id} className="flex-1">
                  Approve
                </Button>
                <DisqualifyLink onClick={() => setDisqualifying(c)} disabled={busy === c.id} />
              </div>
            )}
            {c.status === "approved" && (
              <div>
                <DisqualifyLink onClick={() => setDisqualifying(c)} disabled={busy === c.id} />
              </div>
            )}
          </li>
        ))}
      </ul>

      <DisqualifySheet
        candidate={disqualifying}
        onClose={() => setDisqualifying(null)}
        onDone={(updated) => {
          replace(updated);
          setDisqualifying(null);
        }}
        explain={explain}
      />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-tap shrink-0 rounded-full border px-4 text-sm whitespace-nowrap",
        active ? "border-ink bg-ink text-surface" : "border-line bg-surface",
      )}
    >
      {children}
    </button>
  );
}

function Bio({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" onClick={() => setOpen((o) => !o)} className="text-left text-sm text-muted">
      <span className={open ? undefined : "line-clamp-2"}>&ldquo;{text}&rdquo;</span>
    </button>
  );
}

function DisqualifyLink({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="min-h-tap text-sm font-semibold text-red underline-offset-4 hover:underline disabled:opacity-50">
      Disqualify
    </button>
  );
}

function ApprovedDetails({ candidate }: { candidate: Candidate }) {
  const [downloading, setDownloading] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate rounded-md border border-line bg-paper px-3 py-3 text-sm">{candidate.vote_url.replace(/^https?:\/\//, "")}</span>
        <CopyButton text={candidate.vote_url} label="Copy link" />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-20 shrink-0 overflow-hidden rounded-md border border-line bg-skeleton" style={{ aspectRatio: "4 / 5" }}>
          {candidate.poster_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={candidate.poster_url} alt={`${candidate.name} poster`} className="size-full object-cover" />
          )}
        </div>
        {candidate.poster_url ? (
          <div className="flex flex-col gap-1">
            <Button
              variant="secondary"
              block={false}
              loading={downloading}
              onClick={async () => {
                setDownloading(true);
                setFailed(false);
                try {
                  await downloadFile(candidate.poster_url!, `${candidate.slug}-poster`);
                } catch {
                  setFailed(true);
                } finally {
                  setDownloading(false);
                }
              }}
            >
              Download poster
            </Button>
            {failed && <span className="text-xs text-red">Download failed. Try again.</span>}
          </div>
        ) : (
          <span className="text-sm text-muted">Poster rendering…</span>
        )}
      </div>
    </div>
  );
}

function DisqualifySheet({
  candidate,
  onClose,
  onDone,
  explain,
}: {
  candidate: Candidate | null;
  onClose: () => void;
  onDone: (updated: Candidate) => void;
  explain: (e: unknown) => string;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forId, setForId] = useState<string | null>(null);
  if ((candidate?.id ?? null) !== forId) {
    setForId(candidate?.id ?? null);
    setReason("");
    setError(null);
  }

  async function submit() {
    if (!candidate || reason.trim().length < MIN_REASON) return;
    setLoading(true);
    setError(null);
    try {
      const { candidate: updated } = await bff<{ candidate: Candidate }>(
        `/candidates/${encodeURIComponent(candidate.id)}/disqualify`,
        json("PATCH", { reason: reason.trim() }),
      );
      onDone(updated);
    } catch (e) {
      setError(explain(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={candidate !== null} onClose={onClose} title={candidate ? `Disqualify ${candidate.name}?` : "Disqualify"} locked={loading}>
      <p className="text-sm text-muted">
        They will be removed from voting immediately and their held funds will be withheld at settlement.
      </p>
      <Textarea
        label="Reason (required)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={1000}
        hint={`At least ${MIN_REASON} characters. Kept for the record.`}
        disabled={loading}
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-col gap-2">
        <Button variant="danger" onClick={submit} loading={loading} disabled={reason.trim().length < MIN_REASON}>
          Disqualify
        </Button>
        <button type="button" onClick={onClose} disabled={loading} className="min-h-tap text-sm font-semibold underline underline-offset-4">
          Cancel
        </button>
      </div>
    </Sheet>
  );
}
