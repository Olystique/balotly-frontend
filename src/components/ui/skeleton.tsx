import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Loading placeholder that keeps the shape of what is coming.
 *
 * Used in place of content, never as a spinner over a blank page: a voter on
 * a patchy connection should see the page's structure straight away and the
 * numbers fill in.
 */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-skeleton", className)}
      {...rest}
    />
  );
}

/** A line of body text. */
export function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={cn("h-4 w-full", className)} />;
}

/** A standalone display number, the size vote counts and prices render at. */
export function SkeletonNumber({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-24", className)} />;
}
