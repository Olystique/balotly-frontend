import { cn } from "@/lib/cn";

export const WIZARD_STEPS = ["Organization", "Contest", "Categories", "Vote packages"] as const;

/**
 * "Step 2 of 4 · Contest". A line on a phone; a list of all four steps from
 * md up, beside the form. The one flow in the product where a visible
 * sequence belongs, because it really is one.
 */
export function WizardProgress({ step }: { step: number }) {
  return (
    <nav aria-label="Setup progress" className="md:w-48 md:shrink-0">
      <p className="text-sm font-medium text-muted md:hidden">
        Step {step} of {WIZARD_STEPS.length} · {WIZARD_STEPS[step - 1]}
      </p>
      <ol className="hidden flex-col gap-3 md:flex">
        {WIZARD_STEPS.map((name, i) => (
          <li key={name} className={cn("flex items-center gap-3 text-sm", i + 1 === step ? "font-semibold text-ink" : "text-muted")}>
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full border font-display text-sm",
                i + 1 < step ? "border-green bg-green text-surface" : i + 1 === step ? "border-ink" : "border-line",
              )}
            >
              {i + 1 < step ? "✓" : i + 1}
            </span>
            {name}
          </li>
        ))}
      </ol>
    </nav>
  );
}
