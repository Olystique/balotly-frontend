"use client";

import Link from "next/link";
import { useState } from "react";
import { CategoryTabs } from "@/components/leaderboard/category-tabs";
import { LeaderboardList } from "@/components/leaderboard/leaderboard-list";
import { LiveStatus } from "@/components/leaderboard/live-status";
import { ButtonLink } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { StatusPill } from "@/components/ui/status-pill";
import { formatCount, formatDateTime } from "@/lib/format";
import { useLiveLeaderboard } from "@/lib/live-leaderboard";
import { formatNaira } from "@/lib/money";
import type { OrganizerDashboard } from "@/lib/types";
import { StatusControls } from "./status-controls";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const SECTIONS = [
  { id: "status", label: "Status" },
  { id: "results", label: "Results" },
  { id: "revenue", label: "Revenue" },
  { id: "candidates", label: "Candidates" },
  { id: "share", label: "Share" },
];

/**
 * The organizer's one dense screen. Organizers are a small, repeat,
 * motivated audience watching numbers move, so several sections share the
 * page; each still has at most one primary action.
 */
export function Dashboard({ data, votingOpen }: { data: OrganizerDashboard; votingOpen: boolean }) {
  const { contest, revenue, candidates, approval_queue: queue, settlement } = data;
  const { leaderboard, connected } = useLiveLeaderboard(votingOpen ? contest.id : "", data.leaderboard);
  const board = leaderboard ?? data.leaderboard;
  const [categoryId, setCategoryId] = useState(board.categories[0]?.id ?? "");
  const category = board.categories.find((c) => c.id === categoryId) ?? board.categories[0];
  const sections = contest.status === "closed" ? [...SECTIONS, { id: "settlement", label: "Settlement" }] : SECTIONS;
  const applyUrl = `${SITE}/candidate/apply?contest=${contest.id}`;
  const leaderboardUrl = `${SITE}/contests/${contest.id}/leaderboard`;

  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-6 px-4 py-6 md:max-w-5xl md:flex-row md:gap-10">
      <aside className="md:sticky md:top-6 md:w-56 md:shrink-0 md:self-start">
        <Link href="/organizer" className="text-sm text-muted underline-offset-4 hover:underline">
          All contests
        </Link>
        <h1 className="mt-1 text-3xl leading-tight break-words md:text-2xl">{contest.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusPill status={contest.status} />
          {votingOpen && <LiveStatus status="active" connected={connected} />}
          {contest.status === "active" && !votingOpen && <span className="text-sm text-muted">Not open yet</span>}
        </div>
        <p className="mt-2 text-sm text-muted">
          {formatDateTime(contest.starts_at)} to {formatDateTime(contest.ends_at)}
        </p>
        <nav aria-label="Sections" className="mt-5 hidden flex-col gap-1 md:flex">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface hover:text-ink">
              {s.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-8">
        <Section id="status" title="Status">
          <StatusControls contest={contest} />
        </Section>

        {candidates.pending_approval > 0 && (
          <section className="flex flex-col gap-3 rounded-lg border border-gold bg-surface px-4 py-4">
            <p className="font-semibold">
              {candidates.pending_approval} {candidates.pending_approval === 1 ? "application" : "applications"} waiting
            </p>
            <p className="text-sm text-muted">
              {queue.slice(0, 3).map((c) => c.name).join(", ")}
              {queue.length > 3 ? ` and ${queue.length - 3} more` : ""}
            </p>
            <ButtonLink href={`/organizer/contests/${contest.id}/candidates`} variant="secondary">
              Review applications
            </ButtonLink>
          </section>
        )}

        <Section id="results" title="Live results">
          {contest.status === "draft" ? (
            <p className="text-sm text-muted">Results appear here when voting opens.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">{formatCount(board.total_votes)} votes cast</p>
              <CategoryTabs categories={board.categories} activeId={category?.id ?? ""} onChange={setCategoryId} />
              {category && <LeaderboardList candidates={category.candidates} dense />}
            </div>
          )}
        </Section>

        <Section id="revenue" title="Revenue">
          <dl className="grid grid-cols-2 gap-3">
            <Stat label="Gross" value={formatNaira(revenue.gross_kobo)} large />
            <Stat label="Platform fee" value={formatNaira(revenue.platform_fee_kobo)} />
          </dl>
          <p className="text-sm text-muted">
            {formatCount(revenue.successful_transactions)} successful payments · {formatCount(revenue.pending_transactions)} pending ·{" "}
            {formatCount(revenue.failed_transactions)} failed
          </p>
        </Section>

        <Section id="candidates" title="Candidates">
          <dl className="grid grid-cols-3 gap-3">
            <Stat label="Pending" value={formatCount(candidates.pending_approval)} />
            <Stat label="Approved" value={formatCount(candidates.approved)} />
            <Stat label="Disqualified" value={formatCount(candidates.disqualified)} />
          </dl>
          <Link href={`/organizer/contests/${contest.id}/candidates`} className="min-h-tap self-start text-sm font-semibold underline underline-offset-4">
            Manage candidates
          </Link>
        </Section>

        <Section id="share" title="Share">
          <ShareRow label="Application link, for candidates" url={applyUrl} />
          <ShareRow label="Public results" url={leaderboardUrl} />
        </Section>

        {contest.status === "closed" && (
          <Section id="settlement" title="Settlement">
            <dl className="grid grid-cols-3 gap-3">
              <Stat label="Held" value={formatNaira(settlement.held_kobo)} />
              <Stat label="Released" value={formatNaira(settlement.released_kobo)} />
              <Stat label="Withheld" value={formatNaira(settlement.reversed_kobo)} />
            </dl>
            <ButtonLink href={`/organizer/contests/${contest.id}/settlements`}>Manage settlement</ButtonLink>
          </Section>
        )}
      </div>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-3">
      <h2 className="text-xl">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value, large = false }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg border border-line bg-surface px-3 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={large ? "truncate font-display text-2xl font-semibold tabular-nums" : "truncate font-display text-lg font-semibold tabular-nums"}>{value}</dd>
    </div>
  );
}

function ShareRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate rounded-md border border-line bg-surface px-3 py-3 text-sm">{url.replace(/^https?:\/\//, "")}</span>
        <CopyButton text={url} />
      </div>
    </div>
  );
}
