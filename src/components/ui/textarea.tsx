import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  /** Shows "12 / 500" under the field when set. */
  maxLength?: number;
}

/** Multi line sibling of Input: same label, hint and error behaviour. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, id, className, maxLength, value, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const message = error ?? hint;
  const length = typeof value === "string" ? value.length : 0;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        ref={ref}
        id={fieldId}
        value={value}
        maxLength={maxLength}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          "w-full resize-y rounded-md border bg-surface px-3.5 py-2.5 text-base placeholder:text-muted",
          "focus:outline-none focus:ring-2",
          error ? "border-red focus:ring-red/30" : "border-line focus:border-green focus:ring-green/30",
          "disabled:bg-paper disabled:text-muted",
          className,
        )}
        {...rest}
      />
      <div className="flex justify-between gap-3 text-sm">
        <p id={messageId} role={error ? "alert" : undefined} className={error ? "text-red" : "text-muted"}>
          {message}
        </p>
        {maxLength && (
          <span className="shrink-0 text-muted tabular-nums">
            {length} / {maxLength}
          </span>
        )}
      </div>
    </div>
  );
});
