import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/ui/notice";
import { load } from "@/lib/session";
import type { Candidate, Category, Contest } from "@/lib/types";
import { CandidateQueue } from "./candidate-queue";

export const metadata: Metadata = { title: "Candidates · Balotly" };

type Props = { params: Promise<{ id: string }> };

/** The candidate approval queue for one contest (FE-09). */
export default async function CandidatesPage({ params }: Props) {
  const id = encodeURIComponent((await params).id);
  const [contest, candidates, categories] = await Promise.all([
    load<{ contest: Contest }>(`/contests/${id}`),
    load<{ candidates: Candidate[] }>(`/contests/${id}/candidates`),
    load<{ categories: Category[] }>(`/contests/${id}/categories`),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-5 px-4 py-6 md:max-w-3xl">
      {contest.error || candidates.error || categories.error ? (
        <Notice tone="error">
          {contest.error?.status === 404 ? "We couldn't find that contest." : "We couldn't load the candidates. Check your connection and try again."}{" "}
          <Link href="/organizer" className="font-semibold underline underline-offset-4">
            Back to contests
          </Link>
        </Notice>
      ) : (
        <>
          <header className="flex flex-col gap-1">
            <Link href={`/organizer/contests/${contest.data.contest.id}`} className="text-sm text-muted underline-offset-4 hover:underline">
              {contest.data.contest.name}
            </Link>
            <h1 className="text-3xl">Candidates</h1>
          </header>
          <CandidateQueue candidates={candidates.data.candidates} categories={categories.data.categories} />
        </>
      )}
    </main>
  );
}
