"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import type { ContestStatus } from "@/lib/types";

/** "Live" with a green dot, "Reconnecting" while the socket is down, "Final results" once closed. */
export function LiveStatus({ status, connected }: { status: ContestStatus; connected: boolean }) {
  if (status === "closed") return <span className="text-sm font-medium text-muted">Final results</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
      <span className={cn("size-2 rounded-full", connected ? "animate-pulse bg-green" : "bg-line")} aria-hidden="true" />
      <span className={connected ? "text-green" : "text-muted"}>{connected ? "Live" : "Reconnecting"}</span>
    </span>
  );
}

/** "Updated just now", refreshed every few seconds so it stays honest. */
export function UpdatedAgo({ at }: { at: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  return <p className="text-sm text-muted">Updated {timeAgo(at, Math.max(now, Date.parse(at)))}</p>;
}
