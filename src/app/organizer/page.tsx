import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDateTime } from "@/lib/format";
import { getSession, load } from "@/lib/session";
import type { Contest } from "@/lib/types";

export const metadata: Metadata = { title: "Contests · Balotly" };

/** The organizer home (FE-08): onboarding first, then the list of contests. */
export default async function OrganizerHome() {
  const user = await getSession();
  if (user?.role === "organizer" && !user.organization_id) redirect("/organizer/onboarding");

  const { data, error } = await load<{ contests: Contest[] }>("/contests");

  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-5 px-4 py-6 md:max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl">Contests</h1>
        {data && data.contests.length > 0 && (
          <ButtonLink href="/organizer/contests/new" block={false} variant="secondary">
            New contest
          </ButtonLink>
        )}
      </div>
      {error && <Notice tone="error">We couldn&apos;t load your contests. Check your connection and try again.</Notice>}
      {data && data.contests.length === 0 && (
        <div className="flex flex-col gap-4 py-6">
          <p className="text-muted">Set up your first contest: positions or awards, vote prices, then invite candidates.</p>
          <ButtonLink href="/organizer/contests/new">Create your first contest</ButtonLink>
        </div>
      )}
      {data && data.contests.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.contests.map((c) => (
            <li key={c.id}>
              <Link
                href={`/organizer/contests/${c.id}`}
                className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:border-ink"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="font-semibold break-words">{c.name}</span>
                  <StatusPill status={c.status} />
                </span>
                <span className="text-sm text-muted">
                  {formatDateTime(c.starts_at)} to {formatDateTime(c.ends_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
