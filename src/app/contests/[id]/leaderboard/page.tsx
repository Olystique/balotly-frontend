import type { Metadata } from "next";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import type { Leaderboard } from "@/lib/types";
import { LiveLeaderboard } from "./live-leaderboard";

type Props = { params: Promise<{ id: string }> };

async function load(id: string): Promise<{ board: Leaderboard | null; error: ApiError | null }> {
  try {
    return { board: await apiFetch<Leaderboard>(`/contests/${encodeURIComponent(id)}/leaderboard`), error: null };
  } catch (error) {
    if (error instanceof ApiError) return { board: null, error };
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { board } = await load((await params).id);
  return { title: board ? `${board.contest.name} · Live results · Balotly` : "Contest not found · Balotly" };
}

/**
 * The public live leaderboard (FE-04). Rendered once on the server for a
 * fast first paint; the WebSocket takes over in the browser.
 */
export default async function LeaderboardPage({ params }: Props) {
  const { board, error } = await load((await params).id);
  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-4 px-4 pb-10 pt-5 sm:max-w-xl">
      <Link href="/" className="font-display text-sm font-semibold">
        Balotly
      </Link>
      {board ? (
        <LiveLeaderboard initial={board} />
      ) : (
        <div className="flex flex-col gap-2 py-10 text-center">
          <h1 className="text-2xl">
            {error?.status === 404 ? "We couldn't find that contest" : "We couldn't load the results"}
          </h1>
          <p className="text-muted">
            {error?.status === 404 ? "Check the link you were sent." : "Check your connection and pull to refresh."}
          </p>
        </div>
      )}
    </main>
  );
}
