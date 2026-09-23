"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";

/** "2 hours ago", kept current while the page is open. */
export function TimeAgo({ iso }: { iso: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {timeAgo(iso, now)}
    </time>
  );
}
