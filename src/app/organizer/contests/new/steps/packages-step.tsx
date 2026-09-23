"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { ApiError, NETWORK_MESSAGE, bff, json } from "@/lib/api";
import { cn } from "@/lib/cn";
import { votesLabel } from "@/lib/format";
import { nairaInputToKobo } from "@/lib/money";
import type { Contest, VotePackage } from "@/lib/types";

type Row = {
  key: string;
  naira: string;
  votes: string;
  label: string;
  featured: boolean;
  /** Set once the package exists on the server; saved rows are not re-sent. */
  savedId: string | null;
  error: string | null;
};

const DEFAULTS: Array<[string, string, boolean]> = [
  ["100", "1", false],
  ["500", "5", true],
  ["1,000", "10", false],
];

let nextKey = 0;
const key = () => `row-${nextKey++}`;

function fromExisting(p: VotePackage): Row {
  return {
    key: key(),
    naira: String(p.amount_kobo / 100),
    votes: String(p.vote_count),
    label: p.label,
    featured: p.is_featured,
    savedId: p.id,
    error: null,
  };
}

/**
 * The price ladder, prefilled with the N100 / N500 / N1,000 suggestion and
 * all of it editable. Naira becomes kobo once, in nairaInputToKobo. Rows are
 * created one at a time and remembered, so if one fails the rest are not
 * created twice when the organizer tries again.
 */
export function PackagesStep({
  contest,
  existing,
  onBack,
  onContinue,
}: {
  contest: Contest;
  existing: VotePackage[];
  onBack: () => void;
  onContinue: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    existing.length
      ? existing.map(fromExisting)
      : DEFAULTS.map(([naira, votes, featured]) => ({ key: key(), naira, votes, label: "", featured, savedId: null, error: null })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `/contests/${encodeURIComponent(contest.id)}/vote-packages`;

  const update = (k: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === k ? { ...r, ...patch, error: null } : r)));
  const feature = (k: string) => setRows((rs) => rs.map((r) => ({ ...r, featured: r.key === k })));

  async function remove(row: Row) {
    setError(null);
    if (row.savedId) {
      try {
        await bff(`${base}/${encodeURIComponent(row.savedId)}`, { method: "DELETE" });
      } catch (e) {
        return setError(e instanceof ApiError && e.code !== "NETWORK_ERROR" ? e.message : NETWORK_MESSAGE);
      }
    }
    setRows((rs) => rs.filter((r) => r.key !== row.key));
  }

  function validate(): boolean {
    const seen = new Set<number>();
    let ok = true;
    const checked = rows.map((r) => {
      const kobo = nairaInputToKobo(r.naira);
      const votes = Number(r.votes);
      let problem: string | null = null;
      if (kobo === null) problem = "Enter a whole number of naira, like 500.";
      else if (!Number.isInteger(votes) || votes <= 0) problem = "Votes must be a whole number above zero.";
      else if (seen.has(kobo)) problem = "Two packages can't have the same price.";
      if (kobo !== null) seen.add(kobo);
      if (problem) ok = false;
      return { ...r, error: problem };
    });
    setRows(checked);
    return ok;
  }

  async function save() {
    setError(null);
    if (!validate()) return;
    setSaving(true);
    let current = rows;
    for (const row of current) {
      if (row.savedId) continue;
      try {
        const { vote_package } = await bff<{ vote_package: VotePackage }>(base, json("POST", {
          amount_kobo: nairaInputToKobo(row.naira),
          vote_count: Number(row.votes),
          label: row.label.trim() || votesLabel(Number(row.votes)),
          is_featured: row.featured,
        }));
        current = current.map((r) => (r.key === row.key ? { ...r, savedId: vote_package.id } : r));
        setRows(current);
      } catch (e) {
        const message =
          e instanceof ApiError && e.code === "VOTE_PACKAGE_EXISTS"
            ? "There's already a package at this price."
            : e instanceof ApiError && e.code !== "NETWORK_ERROR"
              ? e.message
              : "This one didn't save. Check your connection and try again; the others are kept.";
        setRows(current.map((r) => (r.key === row.key ? { ...r, error: message } : r)));
        setSaving(false);
        return;
      }
    }
    // A saved package whose "most popular" choice changed afterwards.
    const featured = current.find((r) => r.featured && r.savedId);
    const serverFeatured = existing.find((p) => p.is_featured)?.id;
    if (featured && featured.savedId !== serverFeatured && existing.some((p) => p.id === featured.savedId)) {
      try {
        await bff(`${base}/${encodeURIComponent(featured.savedId!)}`, json("PATCH", { is_featured: true }));
      } catch {
        setSaving(false);
        return setError("The packages are saved, but the most popular choice didn't update. Try again.");
      }
    }
    setSaving(false);
    onContinue();
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl">Vote packages</h1>
        <p className="text-muted">What a vote costs. Change the prices and counts to suit your contest.</p>
      </header>

      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.key} className={cn("flex flex-col gap-3 rounded-lg border bg-surface px-4 py-4", row.error ? "border-red" : row.featured ? "border-gold" : "border-line")}>
            <div className="grid grid-cols-2 gap-3">
              <SmallField label="Amount (₦)" inputMode="numeric" value={row.naira} onChange={(v) => update(row.key, { naira: v })} disabled={saving || !!row.savedId} />
              <SmallField label="Votes" inputMode="numeric" value={row.votes} onChange={(v) => update(row.key, { votes: v.replace(/\D/g, "") })} disabled={saving || !!row.savedId} />
            </div>
            <SmallField
              label="Label (optional)"
              placeholder={Number(row.votes) > 0 ? votesLabel(Number(row.votes)) : "e.g. 5 votes"}
              value={row.label}
              onChange={(v) => update(row.key, { label: v })}
              disabled={saving || !!row.savedId}
            />
            <div className="flex items-center justify-between gap-3">
              <label className="flex min-h-tap cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="featured" checked={row.featured} onChange={() => feature(row.key)} disabled={saving} className="size-4 accent-gold" />
                <span className={row.featured ? "font-semibold text-gold" : undefined}>Most popular</span>
              </label>
              <button type="button" onClick={() => remove(row)} disabled={saving || rows.length === 1} className="min-h-tap text-sm font-semibold text-red underline-offset-4 hover:underline disabled:opacity-40">
                Remove
              </button>
            </div>
            {row.savedId && !row.error && <p className="text-xs text-muted">Saved</p>}
            {row.error && <p className="text-sm text-red" role="alert">{row.error}</p>}
          </li>
        ))}
      </ul>

      <Button variant="secondary" onClick={() => setRows((rs) => [...rs, { key: key(), naira: "", votes: "", label: "", featured: false, savedId: null, error: null }])} disabled={saving}>
        Add another package
      </Button>

      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-col gap-2">
        <Button onClick={save} loading={saving} disabled={rows.length === 0}>
          Continue
        </Button>
        <button type="button" onClick={onBack} disabled={saving} className="min-h-tap text-center text-sm font-semibold text-muted underline underline-offset-4">
          Back to categories
        </button>
      </div>
    </div>
  );
}

function SmallField({
  label,
  value,
  onChange,
  disabled,
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputMode?: "numeric";
  placeholder?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        inputMode={inputMode}
        placeholder={placeholder}
        className="min-h-tap w-full rounded-md border border-line bg-paper px-3 py-2 text-base tabular-nums focus:border-green focus:outline-none focus:ring-2 focus:ring-green/30 disabled:text-muted"
      />
    </label>
  );
}
