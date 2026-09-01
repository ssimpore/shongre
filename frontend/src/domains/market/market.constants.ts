/**
 * Homepage recent-search presentation is market configuration, not a UI
 * constant. Keeping the safe range here lets the admin editor and consuming
 * components apply the same rules when a persisted demo override is stale.
 */
export const RECENT_SEARCHES_LIMIT_DEFAULT = 6;
export const RECENT_SEARCHES_LIMIT_MIN = 1;
export const RECENT_SEARCHES_LIMIT_MAX = 8;

/**
 * Initial search-price scale for the configured default market. Other markets
 * materialize their own value and never inherit changes at runtime.
 */
export const PRICE_FILTER_STOPS_MAJOR_DEFAULT = [
  0, 10, 20, 30, 40, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1_000, 1_500,
  2_000, 3_000, 5_000, 7_500, 10_000, 15_000, 20_000, 30_000, 50_000, 75_000,
  100_000, 200_000, 350_000, 500_000,
] as const;
export const PRICE_FILTER_MINIMUM_STOP_COUNT = 2;
export const PRICE_FILTER_INPUT_CONSTRAINTS = {
  minMajor: PRICE_FILTER_STOPS_MAJOR_DEFAULT[0],
  stepMajor: 1,
} as const;

export function normalizePriceFilterStops(value: unknown): number[] {
  const candidates = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const stops = [
    ...new Set(
      candidates
        .map((entry) => Number(String(entry).trim()))
        .filter((entry) => Number.isFinite(entry) && entry >= 0),
    ),
  ].sort((left, right) => left - right);

  return stops.length >= PRICE_FILTER_MINIMUM_STOP_COUNT
    ? stops
    : [...PRICE_FILTER_STOPS_MAJOR_DEFAULT];
}

export function normalizeRecentSearchesLimit(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return RECENT_SEARCHES_LIMIT_DEFAULT;
  }

  return Math.min(
    RECENT_SEARCHES_LIMIT_MAX,
    Math.max(RECENT_SEARCHES_LIMIT_MIN, Math.floor(parsed)),
  );
}
