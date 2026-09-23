"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Copies text and says "Copied" for two seconds. Falls back to selecting a
 * hidden field on browsers without the clipboard API (older Android
 * WebViews, which is where a lot of WhatsApp links get opened).
 */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const field = document.createElement("textarea");
      field.value = text;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" block={false} onClick={copy} className="shrink-0 px-4" aria-live="polite">
      {copied ? "Copied" : label}
    </Button>
  );
}
