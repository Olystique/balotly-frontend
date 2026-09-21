import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "danger";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-green text-surface hover:bg-green-deep active:bg-green-deep focus-visible:outline-green",
  secondary:
    "bg-surface text-ink border border-line hover:border-ink active:bg-paper focus-visible:outline-ink",
  danger: "bg-red text-surface hover:brightness-95 focus-visible:outline-red",
};

/** Shared look for a button and a link that behaves like one. */
function buttonClasses(variant: Variant, block: boolean, className?: string) {
  return cn(
    "inline-flex min-h-tap items-center justify-center gap-2 rounded-lg px-5 py-3",
    "font-sans text-base font-semibold leading-none",
    "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
    block && "w-full",
    variantClasses[variant],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /**
   * Shows an inline spinner and blocks further clicks while an async action
   * runs. The label stays visible so the user knows what is in flight.
   */
  loading?: boolean;
  /** Full width. On by default: phones want one wide primary action. */
  block?: boolean;
}

/**
 * The one primary action on a screen.
 *
 * Disabled and loading are different states: disabled means "you cannot do
 * this yet", loading means "it is happening". Both block clicks, only one
 * shows a spinner.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    loading = false,
    block = true,
    disabled,
    className,
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  const inert = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={inert}
      aria-busy={loading || undefined}
      className={cn(
        buttonClasses(variant, block, className),
        "disabled:cursor-not-allowed",
        // Disabled reads as inert; loading keeps full color so the action
        // still looks alive.
        disabled && !loading && "opacity-45",
      )}
      {...rest}
    >
      {loading && <Spinner />}
      <span className="truncate">{children}</span>
    </button>
  );
});

export interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  block?: boolean;
}

/** A navigation that should look like the primary action, such as a call to action. */
export function ButtonLink({
  variant = "primary",
  block = true,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, block, className)} {...rest}>
      <span className="truncate">{children}</span>
    </Link>
  );
}

function Spinner() {
  return (
    <svg
      className="size-4 shrink-0 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
