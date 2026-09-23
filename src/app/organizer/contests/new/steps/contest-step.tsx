"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Switch } from "@/components/ui/switch";
import { ApiError, NETWORK_MESSAGE, bff, json } from "@/lib/api";
import { lagosInputToIso } from "@/lib/format";
import type { Contest } from "@/lib/types";

export function ContestStep({ onCreated }: { onCreated: (contest: Contest) => void }) {
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [requiresMatric, setRequiresMatric] = useState(false);
  const [capped, setCapped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const windowError = startsAt && endsAt && endsAt <= startsAt ? "Voting has to end after it starts." : null;
  const ready = name.trim() && startsAt && endsAt && !windowError;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const { contest } = await bff<{ contest: Contest }>("/contests", json("POST", {
        name: name.trim(),
        starts_at: lagosInputToIso(startsAt),
        ends_at: lagosInputToIso(endsAt),
        requires_matric_number: requiresMatric,
        caps_votes_per_identity: requiresMatric && capped,
      }));
      onCreated(contest);
    } catch (e) {
      setLoading(false);
      if (e instanceof ApiError && e.code === "VALIDATION_ERROR") return setFieldErrors(e.fieldErrors());
      setError(e instanceof ApiError && e.code !== "NETWORK_ERROR" ? e.message : NETWORK_MESSAGE);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl">Your contest</h1>
        <p className="text-muted">Name it and set when voting opens and closes.</p>
      </header>
      <Input label="Contest name" placeholder="e.g. SUG Elections 2026" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} disabled={loading} maxLength={255} />
      <Input label="Voting opens (Lagos time)" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} error={fieldErrors.starts_at} disabled={loading} />
      <Input label="Voting closes (Lagos time)" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} error={windowError ?? fieldErrors.ends_at} disabled={loading} min={startsAt || undefined} />
      <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface px-4 py-4">
        <Switch
          label="Voters must enter a matric number"
          checked={requiresMatric}
          onChange={(on) => {
            setRequiresMatric(on);
            if (!on) setCapped(false);
          }}
          disabled={loading}
        />
        {requiresMatric && (
          <Switch
            label="One vote per matric number"
            hint="Turn this on for elections. Leave it off for awards and pageants where people can vote more than once."
            checked={capped}
            onChange={setCapped}
            disabled={loading}
          />
        )}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" loading={loading} disabled={!ready}>
        Continue
      </Button>
    </form>
  );
}
