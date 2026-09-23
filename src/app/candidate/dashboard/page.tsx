import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Notice } from "@/components/ui/notice";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { load } from "@/lib/session";
import type { CandidateDashboard } from "@/lib/types";
import { LiveVotes } from "./live-votes";
import { PosterBlock } from "./poster-block";

export const metadata: Metadata = { title: "My dashboard · Balotly" };

type Props = { searchParams: Promise<{ candidate?: string | string[] }> };

/**
 * The candidate dashboard (FE-07). A handful of facts, most important
 * first: the vote count, what they will receive, their link and poster.
 */
export default async function CandidateDashboardPage({ searchParams }: Props) {
  const { candidate } = await searchParams;
  const id = typeof candidate === "string" ? candidate : null;
  const result = id ? await load<CandidateDashboard>(`/candidates/${encodeURIComponent(id)}/dashboard`) : null;

  if (!result || result.error) {
    return (
      <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-4 px-4 py-6">
        <Notice tone={result?.error.status === 404 || !result ? "info" : "error"}>
          {result && result.error.status !== 404
            ? "We couldn't load your dashboard. Check your connection and try again."
            : "We couldn't find that application."}{" "}
          <Link href="/candidate" className="font-semibold underline underline-offset-4">
            See your applications
          </Link>
        </Notice>
      </main>
    );
  }

  const d = result.data;
  const { candidate: c, contest, revenue, bank_account: bank, settlement } = d;
  const approved = c.status === "approved";
  const displayUrl = c.vote_url.replace(/^https?:\/\//, "");

  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-8 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl leading-tight break-words">{c.name}</h1>
        <p className="text-sm text-muted">
          {d.category.name} · {contest.name}
        </p>
        <div>
          <StatusPill status={c.status} />
        </div>
        {c.status === "disqualified" && c.disqualification_reason && (
          <Notice tone="error">Reason given: {c.disqualification_reason}</Notice>
        )}
      </header>

      {c.status === "pending_approval" ? (
        <Notice tone="info" className="text-base">
          Your application is waiting for the organizer. Your vote link and poster appear here once you&apos;re approved.
        </Notice>
      ) : (
        <LiveVotes
          candidateId={c.id}
          categoryId={d.category.id}
          contestId={contest.id}
          votingOpen={isVotingOpen(contest.status, contest.starts_at, contest.ends_at)}
          initialTotal={d.votes.total}
          initialRank={d.votes.rank}
          candidateCount={d.votes.category_candidate_count}
        />
      )}

      <Section title="Your share">
        <dl className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
          <Row label="Gross">{formatNaira(revenue.gross_kobo)}</Row>
          <Row label={`Platform fee (${Number(revenue.platform_fee_percent)}%)`}>{formatNaira(revenue.platform_fee_kobo)}</Row>
          <Row label="You receive" strong>
            {formatNaira(revenue.net_kobo)}
          </Row>
          <Row label="Status">
            <SettlementText status={settlement?.status ?? null} actionedAt={settlement?.actioned_at ?? null} reason={c.disqualification_reason} />
          </Row>
        </dl>
      </Section>

      {approved && (
        <Section title="Your vote link">
          <div className="flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate rounded-md border border-line bg-surface px-3 py-3 text-sm">{displayUrl}</span>
            <CopyButton text={c.vote_url} />
          </div>
        </Section>
      )}

      {approved && <PosterBlock candidateId={c.id} slug={c.slug} name={c.name} posterUrl={c.poster_url} />}

      <Section title="Bank account">
        {bank ? (
          <div className="flex flex-col gap-1 rounded-lg border border-line bg-surface px-4 py-3">
            <p className="font-semibold break-words">{bank.account_name}</p>
            <p className="text-sm text-muted">
              {bank.bank_name} · {bank.account_number_masked} · {bank.status === "verified" ? "Linked" : "Waiting for you to confirm"}
            </p>
            {bank.status !== "verified" && (
              <Link href={`/candidate/bank-account?candidate=${c.id}`} className="mt-1 text-sm font-semibold text-green underline underline-offset-4">
                Finish linking
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">Voters can&apos;t vote for you until your bank account is linked.</p>
            <ButtonLink href={`/candidate/bank-account?candidate=${c.id}`} variant={approved ? "primary" : "secondary"}>
              Link your bank account
            </ButtonLink>
          </div>
        )}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children, strong = false }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={strong ? "font-display text-2xl font-semibold tabular-nums" : "text-right text-base tabular-nums"}>{children}</dd>
    </div>
  );
}

function SettlementText({ status, actionedAt, reason }: { status: string | null; actionedAt: string | null; reason: string | null }) {
  if (status === "released") return <span className="text-green">Released{actionedAt ? ` on ${formatDate(actionedAt)}` : ""}</span>;
  if (status === "reversed") return <span className="text-red">Withheld{reason ? ": disqualified" : ""}</span>;
  return <span className="text-sm">Held until the organizer releases it after the contest</span>;
}

/** Server side, per request: whether votes can arrive right now. */
function isVotingOpen(status: string, startsAt: string, endsAt: string): boolean {
  const now = Date.now();
  return status === "active" && Date.parse(startsAt) <= now && now < Date.parse(endsAt);
}
