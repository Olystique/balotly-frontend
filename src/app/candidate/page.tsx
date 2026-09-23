import type { Metadata } from "next";
import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";
import { Notice } from "@/components/ui/notice";
import { AskOrganizer } from "./components/ask-organizer";
import { formatDate } from "@/lib/format";
import { load } from "@/lib/session";
import type { Candidate } from "@/lib/types";

export const metadata: Metadata = { title: "My applications · Balotly" };

type Application = Candidate & { contest_name: string; category_name: string };

/** The candidate home (FE-05): every application this account has made. */
export default async function CandidateHome() {
  const { data, error } = await load<{ candidates: Application[] }>("/candidates/me");

  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl">My applications</h1>
      {error && <Notice tone="error">We couldn&apos;t load your applications. Pull to refresh and try again.</Notice>}
      {data && data.candidates.length === 0 && <AskOrganizer />}
      {data && data.candidates.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.candidates.map((c) => (
            <li key={c.id}>
              <Link
                href={`/candidate/dashboard?candidate=${c.id}`}
                className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:border-ink"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="font-semibold">{c.contest_name}</span>
                  <StatusPill status={c.status} />
                </span>
                <span className="text-sm text-muted">
                  {c.category_name} · applied {formatDate(c.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
