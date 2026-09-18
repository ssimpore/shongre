import { browserPreferencesService } from "../../services/browser-preferences.service";

const RECENT_JOBS_LIMIT = 12;

/**
 * Recently viewed jobs are a device preference: one list per account and per
 * market, so a signed-out reader never sees what a signed-in one opened, and
 * Belgian offers never surface on the French board.
 */
export function employmentRecentJobsStorageKey(
  accountId: string | undefined,
  marketCode: string,
) {
  return `shongre_employment_recent_jobs:${accountId || "guest"}:${marketCode}`;
}

export function readRecentEmploymentJobIds(
  accountId: string | undefined,
  marketCode: string,
): string[] {
  const stored = browserPreferencesService.getByKey<unknown>(
    employmentRecentJobsStorageKey(accountId, marketCode),
    [],
  );
  return Array.isArray(stored)
    ? stored.filter((id): id is string => typeof id === "string")
    : [];
}

/** Moves `jobId` to the front of the list, bounded so it never grows unbounded. */
export function rememberRecentEmploymentJob(
  accountId: string | undefined,
  marketCode: string,
  jobId: string,
): void {
  const recent = readRecentEmploymentJobIds(accountId, marketCode);
  browserPreferencesService.setByKey(
    employmentRecentJobsStorageKey(accountId, marketCode),
    [jobId, ...recent.filter((id) => id !== jobId)].slice(0, RECENT_JOBS_LIMIT),
  );
}

/** Select recently viewed cards from the market-scoped search projection that
 * is already loaded by the page, preserving view order without detail calls. */
export function selectRecentEmploymentJobs<T extends { id: string }>(
  recentIds: readonly string[],
  searchItems: readonly T[],
): T[] {
  const itemsById = new Map(searchItems.map((item) => [item.id, item]));
  return [...new Set(recentIds)].flatMap((id) => {
    const item = itemsById.get(id);
    return item ? [item] : [];
  });
}
