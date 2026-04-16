/**
 * In-memory dedupe for pasted images: same file bytes (SHA-256) → last Cloudinary URL.
 * Scoped to the browser tab session; cleared on refresh.
 */
const urlByContentHash = new Map<string, string>();
const MAX_ENTRIES = 64;

/** Hex SHA-256 of file bytes (stable for identical clipboard images). */
export async function hashImageFileContent(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getCachedSecureUrlForPaste(hash: string): string | undefined {
  return urlByContentHash.get(hash);
}

export function rememberPastedImageUrl(hash: string, secureUrl: string): void {
  if (!urlByContentHash.has(hash) && urlByContentHash.size >= MAX_ENTRIES) {
    const oldest = urlByContentHash.keys().next().value;
    if (oldest !== undefined) urlByContentHash.delete(oldest);
  }
  urlByContentHash.set(hash, secureUrl);
}
