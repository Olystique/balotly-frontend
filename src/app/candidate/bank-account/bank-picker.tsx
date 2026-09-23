"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { Bank } from "@/lib/types";

/**
 * Search as you type, tap to pick. Not a native select: there are about a
 * hundred banks, and scrolling a select wheel on a phone to find one is the
 * slowest part of the whole flow.
 */
export function BankPicker({
  banks,
  value,
  onChange,
  disabled,
}: {
  banks: Bank[];
  value: Bank | null;
  onChange: (bank: Bank | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const id = useId();
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return banks.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 6);
  }, [banks, query]);

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Bank</span>
        <div className="flex min-h-tap items-center justify-between gap-3 rounded-md border border-line bg-surface px-3.5 py-2">
          <span className="truncate text-base">{value.name}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
            className="min-h-tap shrink-0 text-sm font-semibold text-green underline-offset-4 hover:underline"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        Bank
      </label>
      <input
        id={id}
        type="search"
        autoComplete="off"
        placeholder="Start typing your bank's name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
        className="min-h-tap w-full rounded-md border border-line bg-surface px-3.5 py-2.5 text-base placeholder:text-muted focus:border-green focus:outline-none focus:ring-2 focus:ring-green/30"
      />
      {query.trim() && (
        <ul className="overflow-hidden rounded-md border border-line bg-surface" role="listbox" aria-label="Matching banks">
          {matches.length === 0 && <li className="px-3.5 py-3 text-sm text-muted">No bank matches &ldquo;{query}&rdquo;.</li>}
          {matches.map((bank) => (
            <li key={bank.code} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => onChange(bank)}
                className={cn("flex min-h-tap w-full items-center px-3.5 text-left text-base hover:bg-paper")}
              >
                {bank.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
