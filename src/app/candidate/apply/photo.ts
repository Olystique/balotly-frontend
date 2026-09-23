/** The same limits the backend enforces (BE-05), checked before uploading. */
export const PHOTO_TYPES = ["image/jpeg", "image/png"];
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export function photoProblem(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return "Photos must be JPEG or PNG.";
  if (file.size > PHOTO_MAX_BYTES) return "Photos must be 5 MB or smaller.";
  return null;
}
