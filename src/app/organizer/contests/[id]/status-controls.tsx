"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { ApiError, NETWORK_MESSAGE, bff, json } from "@/lib/api";
import { isoToLagosInput, lagosInputToIso } from "@/lib/format";
import type { Contest } from "@/lib/types";

/**
 * Open voting, close voting, and editing the name and end date. One primary
 * action, whichever the contest's status calls for.
 */
export function StatusControls({ contest }: { contest: Contest }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [editing, setEditing] = useState(false);

  const missing = [contest.category_count === 0 && "one category", contest.vote_package_count === 0 && "one vote package"].filter(Boolean);
  const setupLink = (step: string) => `/organizer/contests/new?contest=${contest.id}&step=${step}`;

  async function setStatus(status: "active" | "closed") {
    setLoading(true);
    setError(null);
    try {
      await bff(`/contests/${encodeURIComponent(contest.id)}`, json("PATCH", { status }));
      setConfirmClose(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError && e.code !== "NETWORK_ERROR" ? e.message : NETWORK_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {contest.status === "draft" && (
        <>
          <Button onClick={() => setStatus("active")} loading={loading} disabled={missing.length > 0}>
            Open voting
          </Button>
          {missing.length > 0 && (
            <p className="text-sm text-muted">
              Add at least {missing.join(" and ")} first:{" "}
              {contest.category_count === 0 && (
                <Link href={setupLink("categories")} className="font-semibold text-green underline underline-offset-4">
                  add categories
                </Link>
              )}
              {contest.category_count === 0 && contest.vote_package_count === 0 && " · "}
              {contest.vote_package_count === 0 && (
                <Link href={setupLink("packages")} className="font-semibold text-green underline underline-offset-4">
                  add vote packages
                </Link>
              )}
            </p>
          )}
        </>
      )}
      {contest.status === "active" && (
        <Button variant="danger" onClick={() => setConfirmClose(true)}>
          Close voting
        </Button>
      )}
      {contest.status === "closed" && (
        <p className="text-sm text-muted">Voting closed. The final results and settlement are below.</p>
      )}
      {error && !confirmClose && <Notice tone="error">{error}</Notice>}
      {contest.status !== "closed" && (
        <button type="button" onClick={() => setEditing((e) => !e)} className="min-h-tap self-start text-sm font-semibold underline underline-offset-4">
          {editing ? "Cancel editing" : "Edit name and end date"}
        </button>
      )}
      {editing && <EditForm contest={contest} onSaved={() => { setEditing(false); router.refresh(); }} />}

      <Sheet open={confirmClose} onClose={() => setConfirmClose(false)} title="Close voting now?" locked={loading}>
        <p className="text-sm text-muted">Voting will end now and no more votes will be accepted. This cannot be undone.</p>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-col gap-2">
          <Button variant="danger" onClick={() => setStatus("closed")} loading={loading}>
            Close voting
          </Button>
          <button type="button" onClick={() => setConfirmClose(false)} disabled={loading} className="min-h-tap text-sm font-semibold underline underline-offset-4">
            Keep voting open
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function EditForm({ contest, onSaved }: { contest: Contest; onSaved: () => void }) {
  const [name, setName] = useState(contest.name);
  const [endsAt, setEndsAt] = useState(isoToLagosInput(contest.ends_at));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await bff(`/contests/${encodeURIComponent(contest.id)}`, json("PATCH", { name: name.trim(), ends_at: lagosInputToIso(endsAt) }));
      onSaved();
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "VALIDATION_ERROR"
          ? "Voting has to end after it starts."
          : e instanceof ApiError && e.code !== "NETWORK_ERROR"
            ? e.message
            : NETWORK_MESSAGE,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4 rounded-lg border border-line bg-paper p-4" noValidate>
      <Input label="Contest name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} maxLength={255} />
      <Input label="Voting closes (Lagos time)" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} disabled={loading} />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" variant="secondary" loading={loading} disabled={!name.trim() || !endsAt}>
        Save changes
      </Button>
    </form>
  );
}
