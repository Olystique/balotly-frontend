import type { Metadata } from "next";
import { Notice } from "@/components/ui/notice";
import { load } from "@/lib/session";
import type { ContestApplication } from "@/lib/types";
import { AskOrganizer } from "../components/ask-organizer";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = { title: "Apply · Balotly" };

type Props = { searchParams: Promise<{ contest?: string | string[] }> };

/** Candidate application (FE-05), reached from the link an organizer shares. */
export default async function ApplyPage({ searchParams }: Props) {
  const { contest } = await searchParams;
  const contestId = typeof contest === "string" ? contest : null;

  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-6 px-4 py-6">
      {contestId ? <Application contestId={contestId} /> : <AskOrganizer />}
    </main>
  );
}

async function Application({ contestId }: { contestId: string }) {
  const { data, error } = await load<ContestApplication>(`/contests/${encodeURIComponent(contestId)}/application`);
  if (error) {
    return error.status === 404 ? (
      <>
        <h1 className="text-2xl">We couldn&apos;t find that contest</h1>
        <AskOrganizer />
      </>
    ) : (
      <Notice tone="error">We couldn&apos;t load this contest. Check your connection and try again.</Notice>
    );
  }
  if (data.contest.status === "closed") {
    return (
      <>
        <h1 className="text-2xl">{data.contest.name}</h1>
        <Notice tone="info" className="text-base">Applications for this contest have closed.</Notice>
      </>
    );
  }
  return <ApplyForm application={data} />;
}
