/**
 * Homepage recent-search presentation is market configuration, not a UI
 * constant. Keeping the safe range here lets the admin editor and consuming
 * components apply the same rules when a persisted demo override is stale.
 */
export const RECENT_SEARCHES_LIMIT_DEFAULT = 6;
export const RECENT_SEARCHES_LIMIT_MIN = 1;
export const RECENT_SEARCHES_LIMIT_MAX = 12;

export function normalizeRecentSearchesLimit(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return RECENT_SEARCHES_LIMIT_DEFAULT;
  }

  return Math.min(
    RECENT_SEARCHES_LIMIT_MAX,
    Math.max(RECENT_SEARCHES_LIMIT_MIN, Math.floor(parsed)),
  );
}
