/**
 * Join class names, dropping falsy entries.
 *
 * Small on purpose: the primitives here have a handful of variants each and
 * do not need a merge library to resolve conflicts.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
