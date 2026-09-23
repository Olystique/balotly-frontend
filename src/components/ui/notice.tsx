import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "error" | "info" | "success";

const toneClasses: Record<Tone, string> = {
  error: "border-red/40 bg-red/5 text-red",
  info: "border-line bg-surface text-ink",
  success: "border-green/40 bg-green/5 text-green",
};

/**
 * An inline message tied to what just happened: a failed request, a
 * confirmation. Errors are announced to screen readers.
 */
export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-md border px-3.5 py-3 text-sm", toneClasses[tone], className)}
    >
      {children}
    </div>
  );
}
