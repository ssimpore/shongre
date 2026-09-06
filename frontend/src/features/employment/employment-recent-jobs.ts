export function employmentRecentJobsStorageKey(
  accountId: string | undefined,
  marketCode: string,
) {
  return `shongre_employment_recent_jobs:${accountId || "guest"}:${marketCode}`;
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
