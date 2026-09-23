"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A confirmation that slides up from the bottom on a phone and sits in the
 * middle from md up. Built on the native dialog element, which traps focus,
 * closes on Escape and makes the page behind it inert without any library.
 *
 * `locked` keeps it open while something irreversible is in flight (a
 * settlement release), so a stray tap outside cannot hide the outcome.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  locked = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  locked?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        if (!locked) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !locked) onClose();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none rounded-t-2xl border border-line bg-surface p-0 text-ink backdrop:bg-ink/40 md:inset-0 md:m-auto md:max-w-md md:rounded-2xl"
    >
      <div className="flex flex-col gap-4 px-4 pb-6 pt-5 md:px-6">
        <h2 className="text-xl">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
