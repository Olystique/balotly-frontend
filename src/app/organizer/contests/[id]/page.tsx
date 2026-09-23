import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/ui/notice";
import { load } from "@/lib/session";
import type { OrganizerDashboard } from "@/lib/types";
import { Dashboard } from "./dashboard";

export const metadata: Metadata = { title: "Contest · Balotly" };

type Props = { params: Promise<{ id: string }> };

/** The organizer's contest dashboard (FE-10): everything from one call. */
export default async function ContestDashboardPage({ params }: Props) {
  const id = (await params).id;
  const { data, error } = await load<OrganizerDashboard>(`/organizer/contests/${encodeURIComponent(id)}/dashboard`);
  if (error) {
    return (
      <main className="mx-auto w-full max-w-voter px-4 py-6">
        <Notice tone="error">
          {error.status === 404 ? "We couldn't find that contest." : "We couldn't load this contest. Check your connection and try again."}{" "}
          <Link href="/organizer" className="font-semibold underline underline-offset-4">
            Back to contests
          </Link>
        </Notice>
      </main>
    );
  }
  return <Dashboard data={data} votingOpen={isVotingOpen(data.contest.status, data.contest.starts_at, data.contest.ends_at)} />;
}

/** Server side, per request: whether votes can arrive right now. */
function isVotingOpen(status: string, startsAt: string, endsAt: string): boolean {
  const now = Date.now();
  return status === "active" && Date.parse(startsAt) <= now && now < Date.parse(endsAt);
}
