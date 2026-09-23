"use client";

import { useState, type FormEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { ApiError, apiFetch, json } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatCount, votesLabel } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import type { Checkout, VotePackage, VotePage } from "@/lib/types";
import { Unavailable } from "./unavailable";

type Override = Parameters<typeof Unavailable>[0];

/** The featured package, or the middle one when the organizer picked none. */
export function featuredPackageId(packages: VotePackage[]): string | null {
  const featured = packages.find((p) => p.is_featured);
  if (featured) return featured.id;
  if (packages.length < 2) return null;
  return packages[Math.floor(packages.length / 2)].id;
}

const NOTHING_CHARGED = "Nothing was charged.";

export function VoteScreen({ page }: { page: VotePage }) {
  const { candidate, category, contest, organization, vote_packages: packages } = page;
  const featuredId = featuredPackageId(packages);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matric, setMatric] = useState("");
  const [loading, setLoading] = useState(false);
  const [matricError, setMatricError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [override, setOverride] = useState<Override | null>(null);

  const selected = packages.find((p) => p.id === selectedId) ?? null;
  const needsMatric = contest.requires_matric_number;
  const ready = selected !== null && (!needsMatric || matric.trim().length > 0);

  async function checkout(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setLoading(true);
    setMatricError(null);
    setFormError(null);
    try {
      const body: Record<string, string> = { vote_package_id: selected.id };
      if (needsMatric) body.voter_matric_number = matric.trim().toUpperCase();
      const result = await apiFetch<Checkout>(`/vote/${encodeURIComponent(candidate.slug)}/checkout`, json("POST", body));
      // Stay in the loading state: the page is about to be replaced by Paystack.
      window.location.assign(result.authorization_url);
    } catch (error) {
      setLoading(false);
      if (!(error instanceof ApiError)) {
        return setFormError(`Something went wrong and we couldn't start your payment. ${NOTHING_CHARGED}`);
      }
      switch (error.code) {
        case "MATRIC_NUMBER_ALREADY_VOTED":
          return setMatricError("This matric number has already voted in this contest.");
        case "MATRIC_NUMBER_REQUIRED":
          return setMatricError("Enter your matric number to vote.");
        case "PAYMENT_PROVIDER_UNAVAILABLE":
          return setFormError(`Payment is temporarily unavailable. ${NOTHING_CHARGED} Please try again in a minute.`);
        case "RATE_LIMITED":
          return setFormError(`Too many attempts from your network. Wait a minute and try again. ${NOTHING_CHARGED}`);
        case "NETWORK_ERROR":
          return setFormError(`We couldn't reach the server. Check your connection and try again. ${NOTHING_CHARGED}`);
        case "CANDIDATE_NOT_FOUND":
          return setOverride({ code: "CANDIDATE_NOT_FOUND" });
        case "CANDIDATE_DISQUALIFIED":
          return setOverride({ code: "CANDIDATE_DISQUALIFIED", name: error.field("name") ?? candidate.name });
        case "VOTING_NOT_OPEN":
          return setOverride({ code: "VOTING_NOT_OPEN", startsAt: error.field("starts_at") });
        case "VOTING_CLOSED":
          return setOverride({ code: "VOTING_CLOSED", contestId: error.field("contest_id") ?? contest.id });
        default:
          return setFormError(`Something went wrong and we couldn't start your payment. ${NOTHING_CHARGED}`);
      }
    }
  }

  if (override) return <Unavailable {...override} />;

  return (
    <form onSubmit={checkout} className="flex flex-col gap-8" noValidate>
      <header className="flex flex-col items-center gap-3 text-center">
        <Avatar src={candidate.photo_url} name={candidate.name} size={112} />
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl leading-tight">{candidate.name}</h1>
          <p className="text-base">{category.name}</p>
          <p className="text-sm text-muted">{organization.name}</p>
        </div>
      </header>

      {page.can_vote ? (
        <>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-display text-xl font-semibold">Choose your vote</legend>
            <div className="flex flex-col gap-2.5">
              {packages.map((pack) => (
                <PackageRow
                  key={pack.id}
                  pack={pack}
                  featured={pack.id === featuredId}
                  selected={pack.id === selectedId}
                  onSelect={() => setSelectedId(pack.id)}
                  disabled={loading}
                />
              ))}
            </div>
          </fieldset>

          {needsMatric && (
            <Input
              label="Matric number"
              placeholder="e.g. CSC/2021/044"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              value={matric}
              onChange={(e) => {
                setMatric(e.target.value.toUpperCase());
                setMatricError(null);
              }}
              hint={contest.caps_votes_per_identity ? "One vote per matric number in this contest." : undefined}
              error={matricError ?? undefined}
              disabled={loading}
            />
          )}

          <div className="flex flex-col gap-3">
            {formError && <Notice tone="error">{formError}</Notice>}
            <Button type="submit" loading={loading} disabled={!ready}>
              {selected ? `Vote now · ${formatNaira(selected.amount_kobo)}` : "Choose a vote package"}
            </Button>
            <p className="text-center text-sm text-muted">Your vote is confirmed instantly after payment.</p>
          </div>
        </>
      ) : (
        <Notice tone="info" className="text-center text-base">
          This candidate can&apos;t receive votes yet. Their bank account is still being set up.
        </Notice>
      )}
    </form>
  );
}

function PackageRow({
  pack,
  featured,
  selected,
  onSelect,
  disabled,
}: {
  pack: VotePackage;
  featured: boolean;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  const customLabel = pack.label.trim() && pack.label.trim() !== votesLabel(pack.vote_count) ? pack.label : null;
  return (
    <label
      className={cn(
        "flex min-h-tap cursor-pointer items-center justify-between gap-4 rounded-lg border bg-surface px-4 py-3.5 transition-colors",
        selected ? "border-green ring-2 ring-green" : featured ? "border-gold" : "border-line",
        disabled && "cursor-not-allowed opacity-70",
      )}
    >
      <input
        type="radio"
        name="vote_package"
        value={pack.id}
        checked={selected}
        onChange={onSelect}
        disabled={disabled}
        className="sr-only"
      />
      <span className="flex flex-col">
        <span className="font-display text-2xl font-semibold tabular-nums">{formatNaira(pack.amount_kobo)}</span>
        {featured && <span className="text-xs font-semibold text-gold">Most popular</span>}
        {customLabel && <span className="text-sm text-muted">{customLabel}</span>}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="font-display text-xl font-semibold tabular-nums">{formatCount(pack.vote_count)}</span>
        <span className="text-sm text-muted">{pack.vote_count === 1 ? "vote" : "votes"}</span>
      </span>
    </label>
  );
}
