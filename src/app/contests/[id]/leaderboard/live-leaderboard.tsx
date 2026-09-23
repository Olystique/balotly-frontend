"use client";

import { useSyncExternalStore } from "react";
import { CategoryTabs } from "@/components/leaderboard/category-tabs";
import { LeaderboardList } from "@/components/leaderboard/leaderboard-list";
import { LiveStatus, UpdatedAgo } from "@/components/leaderboard/live-status";
import { formatCount } from "@/lib/format";
import { useLiveLeaderboard } from "@/lib/live-leaderboard";
import type { Leaderboard } from "@/lib/types";

const HASH_PREFIX = "#category-";

export function LiveLeaderboard({ initial }: { initial: Leaderboard }) {
  const { leaderboard, connected } = useLiveLeaderboard(initial.contest.id, initial);
  const board = leaderboard ?? initial;
  // The selected category lives in the URL hash, so a shared link opens the
  // category it was shared from. Read as an external store: empty on the
  // server, the real hash in the browser.
  const hash = useSyncExternalStore(subscribeToHash, readHash, () => "");
  const fromHash = hash.startsWith(HASH_PREFIX) ? hash.slice(HASH_PREFIX.length) : null;
  const activeId = board.categories.some((c) => c.id === fromHash) ? fromHash! : (board.categories[0]?.id ?? "");

  const choose = (id: string) => {
    // replaceState, not a hash assignment: tapping tabs should not fill the
    // back button's history.
    window.history.replaceState(null, "", `${HASH_PREFIX}${id}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const category = board.categories.find((c) => c.id === activeId) ?? board.categories[0];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl leading-tight">{board.contest.name}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <LiveStatus status={board.contest.status} connected={connected} />
          <span className="text-sm text-muted">{formatCount(board.total_votes)} votes cast</span>
        </div>
      </header>

      <CategoryTabs categories={board.categories} activeId={category?.id ?? ""} onChange={choose} />

      {category ? (
        <section className="flex flex-col gap-3" aria-label={category.name}>
          {board.categories.length < 2 && <h2 className="text-xl">{category.name}</h2>}
          <LeaderboardList candidates={category.candidates} />
        </section>
      ) : (
        <p className="py-8 text-center text-muted">No categories in this contest yet.</p>
      )}

      <UpdatedAgo at={board.generated_at} />
    </div>
  );
}

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHash() {
  return window.location.hash;
}
