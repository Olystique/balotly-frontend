"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Leaderboard } from "@/lib/types";

/**
 * The live leaderboard for one contest (BE-12), shared by the public
 * leaderboard, the candidate dashboard and the organizer dashboard.
 *
 * Every frame is a full snapshot, so a reconnect needs no reconciliation:
 * the first frame after it is the truth. Reconnects back off from 1 to 15
 * seconds and never give up. While the socket is down the last known state
 * stays on screen, and the REST endpoint is polled every 15 seconds so a
 * network that blocks WebSockets still sees the count move. Pass an empty
 * id to stay disconnected (a closed contest has nothing to push).
 */
const WS_BASE =
  process.env.NEXT_PUBLIC_WS_BASE_URL ||
  (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001/api/v1")
    .replace(/^http/, "ws")
    .replace(/\/api\/v\d+\/?$/, "");

const FALLBACK_POLL_MS = 15_000;
const MAX_BACKOFF_MS = 15_000;

export function useLiveLeaderboard(contestId: string, initial: Leaderboard | null) {
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(initial);
  const [connected, setConnected] = useState(false);
  const backoff = useRef(1000);

  useEffect(() => {
    // An empty id means "not live": nothing to connect to.
    if (!contestId) return;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    let stopped = false;

    const startPolling = () => {
      if (poll) return;
      poll = setInterval(async () => {
        try {
          setLeaderboard(await apiFetch<Leaderboard>(`/contests/${contestId}/leaderboard`));
        } catch {
          // Keep what is on screen; the next poll or the socket will catch up.
        }
      }, FALLBACK_POLL_MS);
    };
    const stopPolling = () => {
      clearInterval(poll);
      poll = undefined;
    };

    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(`${WS_BASE}/ws/contests/${contestId}`);
      socket.onopen = () => {
        backoff.current = 1000;
        setConnected(true);
        stopPolling();
      };
      socket.onmessage = (event) => {
        let message: { type?: string; data?: Leaderboard };
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type === "ping") socket?.send(JSON.stringify({ type: "pong" }));
        else if (message.type === "leaderboard" && message.data) setLeaderboard(message.data);
      };
      socket.onclose = (event) => {
        setConnected(false);
        if (stopped || event.code === 4404) return; // 4404: no live board for this contest
        startPolling();
        retry = setTimeout(connect, backoff.current);
        backoff.current = Math.min(backoff.current * 2, MAX_BACKOFF_MS);
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      stopPolling();
      socket?.close();
    };
  }, [contestId]);

  return { leaderboard, connected };
}
