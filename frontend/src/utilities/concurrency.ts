/**
 * Maps `items` through `task` with at most `limit` calls in flight and returns
 * the results in input order. A rejection stops new work and rejects the whole
 * map, like `Promise.all`.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed && next < items.length) {
      const index = next++;
      try {
        results[index] = await task(items[index], index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };
  const workers = Math.max(1, Math.min(Math.trunc(limit) || 1, items.length));
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}
