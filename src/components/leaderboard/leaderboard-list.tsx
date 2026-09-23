"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import type { LeaderboardCandidate } from "@/lib/types";
import { AnimatedCount } from "./animated-number";

/**
 * One category, ranked. Rank and vote count lead and are the largest things
 * in the row; the photo and name come second.
 *
 * When a count changes, that number counts up and its row gets a gold edge
 * that fades. When ranks change, rows slide to their new place instead of
 * jumping (a FLIP transition: measure, move back, animate to zero).
 */
export function LeaderboardList({ candidates, dense = false }: { candidates: LeaderboardCandidate[]; dense?: boolean }) {
  const rows = useRef(new Map<string, HTMLLIElement>());
  const previousTop = useRef(new Map<string, number>());
  const previousCount = useRef(new Map<string, number>());
  const [flashing, setFlashing] = useState<Set<string>>(new Set());

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rows.current.forEach((el, id) => {
      const top = el.getBoundingClientRect().top;
      const before = previousTop.current.get(id);
      previousTop.current.set(id, top);
      if (reduce || before === undefined || before === top) return;
      el.style.transition = "none";
      el.style.transform = `translateY(${before - top}px)`;
      requestAnimationFrame(() => {
        el.style.transition = "transform 450ms cubic-bezier(0.2, 0.8, 0.2, 1)";
        el.style.transform = "";
      });
    });
  }, [candidates]);

  useEffect(() => {
    const changed = candidates
      .filter((c) => {
        const before = previousCount.current.get(c.id);
        return before !== undefined && before !== c.vote_count;
      })
      .map((c) => c.id);
    candidates.forEach((c) => previousCount.current.set(c.id, c.vote_count));
    if (!changed.length) return;
    setFlashing(new Set(changed));
    const timer = setTimeout(() => setFlashing(new Set()), 1100);
    return () => clearTimeout(timer);
  }, [candidates]);

  if (!candidates.length) {
    return <p className="py-8 text-center text-muted">No candidates in this category yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-2" aria-label="Ranking">
      {candidates.map((c) => {
        const disqualified = c.status === "disqualified";
        return (
          <li
            key={c.id}
            ref={(el) => {
              if (el) rows.current.set(c.id, el);
              else rows.current.delete(c.id);
            }}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-l-4 bg-surface px-3 transition-[border-color] duration-1000",
              dense ? "py-2" : "py-3",
              flashing.has(c.id) ? "border-l-gold" : "border-l-transparent",
              "border-y-line border-r-line",
              disqualified && "opacity-60",
            )}
          >
            <span className="w-7 shrink-0 text-center font-display text-xl font-semibold text-muted tabular-nums">
              {c.rank ?? "·"}
            </span>
            <AnimatedCount
              value={c.vote_count}
              className={cn(
                "w-[5.5rem] shrink-0 font-display font-semibold tabular-nums",
                dense ? "text-xl" : "text-2xl",
                c.rank === 1 ? "text-gold" : "text-ink",
              )}
            />
            <Avatar src={c.photo_url} name={c.name} size={dense ? 28 : 36} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-base">{c.name}</span>
              {disqualified && <span className="text-xs font-semibold text-red">Disqualified</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
