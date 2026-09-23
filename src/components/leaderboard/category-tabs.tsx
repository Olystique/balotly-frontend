"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Categories as tabs, never a dropdown: voters should see every position at
 * a glance. On a phone the row scrolls sideways inside itself and keeps the
 * active tab in view; the page never scrolls sideways.
 */
export function CategoryTabs({
  categories,
  activeId,
  onChange,
}: {
  categories: Array<{ id: string; name: string }>;
  activeId: string;
  onChange: (id: string) => void;
}) {
  const active = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    active.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId]);

  if (categories.length < 2) return null;

  return (
    <div role="tablist" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {categories.map((category) => {
        const selected = category.id === activeId;
        return (
          <button
            key={category.id}
            ref={selected ? active : undefined}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(category.id)}
            className={cn(
              "min-h-tap shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors",
              selected ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink",
            )}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
