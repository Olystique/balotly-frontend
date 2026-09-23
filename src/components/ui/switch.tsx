"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/** An on or off setting with a label and a line of explanation. */
export function Switch({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn("flex min-h-tap cursor-pointer items-start justify-between gap-4", disabled && "cursor-not-allowed opacity-60")}>
      <span className="flex flex-col gap-0.5">
        <span className="text-base font-medium">{label}</span>
        {hint && <span className="text-sm text-muted">{hint}</span>}
      </span>
      <span className="relative mt-0.5 shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <span className="block h-7 w-12 rounded-full bg-line transition-colors peer-checked:bg-green peer-focus-visible:ring-2 peer-focus-visible:ring-green/40" />
        <span className="absolute left-1 top-1 size-5 rounded-full bg-surface shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
