/** Read the two legacy listing-photo shapes without inventing fallback media. */
export function resolveListingPhotoUrl(photo: unknown): string | undefined {
  if (typeof photo === "string") return photo.trim() || undefined;
  if (!photo || typeof photo !== "object" || !("url" in photo)) {
    return undefined;
  }
  const url = (photo as { url?: unknown }).url;
  return typeof url === "string" ? url.trim() || undefined : undefined;
}
