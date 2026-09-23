import { cn } from "@/lib/cn";

/**
 * A candidate's photo, round, with initials behind it while it loads or if
 * there is none.
 *
 * A plain img rather than next/image: photos come from object storage on a
 * host that differs per deployment, and they are already sized for this.
 */
export function Avatar({
  src,
  name,
  size = 48,
  className,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-skeleton font-display font-semibold text-muted",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
      )}
    </span>
  );
}
