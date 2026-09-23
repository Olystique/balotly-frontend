const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

/**
 * Save a file from another origin as a real download. The download
 * attribute is ignored across origins (posters live in object storage), so
 * the file is fetched as a blob and saved from a local URL instead.
 * `baseName` has no extension; the right one comes from the file's type.
 */
export async function downloadFile(url: string, baseName: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed with ${response.status}`);
  const blob = await response.blob();
  const local = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = local;
  link.download = `${baseName}.${EXTENSIONS[blob.type] ?? "png"}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(local), 1000);
}
