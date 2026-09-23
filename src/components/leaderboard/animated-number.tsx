"use client";

import { useEffect, useRef, useState } from "react";
import { formatCount } from "@/lib/format";

/**
 * A count that moves from its old value to its new one. The only decorative
 * motion in the product: the "results night" moment. Snaps instead when the
 * user has asked for reduced motion.
 */
export function useAnimatedNumber(value: number, durationMs = 600): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = value;
      setShown(value);
      return;
    }
    const began = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - began) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(start + (value - start) * eased);
      from.current = current;
      setShown(current);
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return shown;
}

export function AnimatedCount({ value, className }: { value: number; className?: string }) {
  return <span className={className}>{formatCount(useAnimatedNumber(value))}</span>;
}
