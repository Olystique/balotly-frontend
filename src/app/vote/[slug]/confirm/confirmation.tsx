"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ButtonLink, Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api";
import { formatCount } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import type { TransactionState } from "@/lib/types";
import { POLL_INTERVAL_MS, phaseFor, shouldPoll, type Phase } from "./poll";

export function Confirmation({ slug, reference }: { slug: string; reference: string | null }) {
  const [phase, setPhase] = useState<Phase>(reference ? "confirming" : "missing");
  const [tx, setTx] = useState<TransactionState | null>(null);
  const [round, setRound] = useState(0);
  const waited = useRef(0);

  useEffect(() => {
    if (!reference || !shouldPoll(phase)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const tick = async () => {
      if (document.visibilityState === "hidden") return; // resumed by the listener below
      try {
        const next = await apiFetch<TransactionState>(`/vote/transactions/${encodeURIComponent(reference)}`);
        if (cancelled) return;
        setTx(next);
        const decided = phaseFor(next.status, waited.current);
        if (decided !== "confirming") return setPhase(decided);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.code === "TRANSACTION_NOT_FOUND") return setPhase("missing");
        // A dropped request is not an answer. Keep waiting.
      }
      waited.current += POLL_INTERVAL_MS;
      if (phaseFor(null, waited.current) === "timeout") return setPhase("timeout");
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    // Pause while the voter is back in WhatsApp; each poll costs their data.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reference, phase, round]);

  const checkAgain = useCallback(() => {
    waited.current = 0;
    setPhase("confirming");
    setRound((n) => n + 1);
  }, []);

  const leaderboard = tx ? `/contests/${tx.contest_id}/leaderboard` : null;
  const voteAgain = `/vote/${slug}`;

  if (phase === "missing") {
    return (
      <State icon={<Cross />} title="We couldn't find your payment">
        <p className="text-muted">
          If money left your account, your vote will still be counted once the payment is confirmed.
        </p>
        <ButtonLink href={voteAgain} variant="secondary">
          Back to the vote page
        </ButtonLink>
      </State>
    );
  }

  if (phase === "success" && tx) {
    return (
      <State icon={<Check />} title="Vote recorded">
        <p className="flex flex-col items-center gap-1">
          <CountUp to={tx.vote_count} />
          <span className="text-base">for {tx.candidate.name}</span>
        </p>
        <p className="text-muted">Your payment of {formatNaira(tx.amount_kobo)} is confirmed.</p>
        <div className="flex w-full flex-col gap-3">
          {leaderboard && <ButtonLink href={leaderboard}>See the live leaderboard</ButtonLink>}
          <Link href={voteAgain} className="inline-flex min-h-tap items-center justify-center font-semibold underline underline-offset-4">
            Vote again
          </Link>
        </div>
      </State>
    );
  }

  if (phase === "failed") {
    return (
      <State icon={<Cross />} title="Payment didn't go through">
        <p className="text-muted">
          No vote was recorded and nothing was charged. If you see a debit on your account, your bank will reverse it.
        </p>
        <ButtonLink href={voteAgain}>Try again</ButtonLink>
      </State>
    );
  }

  if (phase === "timeout") {
    return (
      <State icon={<Clock />} title="Still confirming">
        <p className="text-muted">
          Your payment is taking longer than usual to confirm. If it went through, your vote will be counted
          automatically. <span className="font-semibold text-ink">You don&apos;t need to pay again.</span>
        </p>
        <div className="flex w-full flex-col gap-3">
          <Button onClick={checkAgain}>Check again</Button>
          {leaderboard && (
            <Link href={leaderboard} className="inline-flex min-h-tap items-center justify-center font-semibold underline underline-offset-4">
              See the leaderboard
            </Link>
          )}
        </div>
      </State>
    );
  }

  return (
    <State icon={<Spinner />} title="Confirming your vote" live>
      <p className="text-muted">
        This usually takes a few seconds.
        <br />
        Don&apos;t close this page.
      </p>
    </State>
  );
}

function State({
  icon,
  title,
  children,
  live = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  live?: boolean;
}) {
  return (
    <section className="flex flex-col items-center gap-5 py-8 text-center" aria-live={live ? "polite" : undefined}>
      {icon}
      <h1 className="text-3xl">{title}</h1>
      {children}
    </section>
  );
}

/** "+5 votes", counting up once. The one piece of motion on the voter side. */
function CountUp({ to }: { to: number }) {
  const [shown, setShown] = useState(to);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(t) {
      const progress = Math.min(1, (t - start) / 300);
      setShown(Math.max(1, Math.round(to * (1 - Math.pow(1 - progress, 3)))));
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [to]);
  return (
    <span className="font-display text-5xl font-semibold tabular-nums text-gold">
      +{formatCount(shown)} {to === 1 ? "vote" : "votes"}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="size-14 animate-spin text-green" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Check() {
  return (
    <span className="flex size-14 items-center justify-center rounded-full bg-green text-surface" aria-hidden="true">
      <svg className="size-7" viewBox="0 0 24 24" fill="none">
        <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Cross() {
  return (
    <span className="flex size-14 items-center justify-center rounded-full bg-red text-surface" aria-hidden="true">
      <svg className="size-7" viewBox="0 0 24 24" fill="none">
        <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function Clock() {
  return (
    <span className="flex size-14 items-center justify-center rounded-full border-2 border-line text-muted" aria-hidden="true">
      <svg className="size-7" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
