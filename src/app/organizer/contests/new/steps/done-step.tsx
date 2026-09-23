"use client";

import { ButtonLink } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import type { Contest } from "@/lib/types";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** The end of setup: the link candidates apply through, and the contest page. */
export function DoneStep({ contest }: { contest: Contest }) {
  const applyUrl = `${SITE}/candidate/apply?contest=${contest.id}`;
  return (
    <section className="flex flex-col gap-5">
      <span className="flex size-14 items-center justify-center rounded-full bg-green text-surface" aria-hidden="true">
        <svg className="size-7" viewBox="0 0 24 24" fill="none">
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h1 className="text-3xl break-words">{contest.name} is set up</h1>
      <p className="text-muted">It&apos;s a draft. Candidates can apply now; voting opens when you activate it.</p>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Share this link with candidates</span>
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate rounded-md border border-line bg-surface px-3 py-3 text-sm">{applyUrl.replace(/^https?:\/\//, "")}</span>
          <CopyButton text={applyUrl} />
        </div>
      </div>
      <ButtonLink href={`/organizer/contests/${contest.id}`}>Go to the contest</ButtonLink>
    </section>
  );
}
