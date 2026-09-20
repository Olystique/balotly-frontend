import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Short guidance under the field, shown when there is no error. */
  hint?: string;
  /**
   * Plain-language failure. Replaces the hint, turns the border red and is
   * announced to screen readers.
   */
  error?: string;
}

/**
 * Text input with its label, hint and error in one piece so no screen can
 * ship a field without a label or an error without a message.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, className, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={inputId} className="font-sans text-sm font-medium text-ink">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          "min-h-tap w-full rounded-md border bg-surface px-3.5 py-2.5",
          "font-sans text-base text-ink placeholder:text-muted",
          "transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0",
          error
            ? "border-red focus:border-red focus:ring-red/30"
            : "border-line focus:border-green focus:ring-green/30",
          "disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted",
          className,
        )}
        {...rest}
      />
      {message && (
        <p
          id={messageId}
          role={error ? "alert" : undefined}
          className={cn("font-sans text-sm", error ? "text-red" : "text-muted")}
        >
          {message}
        </p>
      )}
    </div>
  );
});
