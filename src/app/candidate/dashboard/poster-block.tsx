"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { ApiError, bff, json } from "@/lib/api";
import { downloadFile } from "@/lib/download";

/**
 * The poster, with a real download (see downloadFile for why that takes a
 * fetch) and regenerate.
 */
export function PosterBlock({
  candidateId,
  slug,
  name,
  posterUrl,
}: {
  candidateId: string;
  slug: string;
  name: string;
  posterUrl: string | null;
}) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  // The poster URL at the moment a new one was asked for. While the URL is
  // still that, a render is pending; derived, not stored, so it clears itself
  // the moment the new poster arrives.
  const [requestedAt, setRequestedAt] = useState<{ url: string | null } | null>(null);
  const waiting = requestedAt !== null && requestedAt.url === posterUrl;
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  // While waiting, refresh the page data every 10 seconds.
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(timer);
  }, [waiting, router]);

  async function download() {
    if (!posterUrl) return;
    setDownloading(true);
    setMessage(null);
    try {
      await downloadFile(posterUrl, `${slug}-poster`);
    } catch {
      setMessage({ tone: "error", text: "We couldn't download your poster. Check your connection and try again." });
    } finally {
      setDownloading(false);
    }
  }

  async function regenerate() {
    setRegenerating(true);
    setMessage(null);
    try {
      await bff(`/candidates/${encodeURIComponent(candidateId)}/poster/regenerate`, json("POST"));
      setRequestedAt({ url: posterUrl });
    } catch (e) {
      setMessage({
        tone: "error",
        text: e instanceof ApiError && e.code === "RATE_LIMITED" ? "Please wait a minute before regenerating again." : "We couldn't start a new poster. Please try again.",
      });
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg">Your poster</h2>
      {posterUrl ? (
        <div className="mx-auto w-full max-w-[16rem] overflow-hidden rounded-lg border border-line bg-surface" style={{ aspectRatio: "4 / 5" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={posterUrl} alt={`${name} campaign poster`} className="size-full object-cover" />
        </div>
      ) : (
        <Notice tone="info">Your poster is being made. It appears here in a minute or two.</Notice>
      )}
      {waiting && <Notice tone="info">Rendering a new poster. This takes about a minute.</Notice>}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <Button onClick={download} loading={downloading} disabled={!posterUrl}>
        Download poster
      </Button>
      <button
        type="button"
        onClick={regenerate}
        disabled={regenerating || waiting}
        className="min-h-tap text-center text-sm font-semibold text-muted underline underline-offset-4 disabled:opacity-50"
      >
        {regenerating ? "Asking for a new poster" : "Regenerate poster"}
      </button>
    </section>
  );
}
