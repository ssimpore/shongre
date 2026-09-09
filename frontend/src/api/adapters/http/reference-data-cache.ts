import type { GeneratedApiOperationId } from "@shongre/contracts/api-client";

/**
 * One request per piece of reference data per page, instead of one per reader.
 *
 * Nothing in the client deduplicated anything, so every component that needed
 * the market's navigation asked for it: the header, the category bar and the
 * footer each mount on every route and each issued the same
 * `taxonomy/header-navigation`. Market and currency definitions went the same
 * way. A detail page opened with four identical `markets/FR` calls and two of
 * everything else, on a payload that never changes between them.
 *
 * Two mechanisms, deliberately separate:
 *
 * - **Single flight** collapses concurrent identical calls into one request.
 *   This is safe for anything, because the second caller would have received
 *   the same response anyway.
 * - **A short TTL** additionally serves a completed response to later callers.
 *   This is *not* safe for anything, so it applies only to the named list
 *   below: market, currency and taxonomy definitions, which are editorial data
 *   changed by Staff and read by everyone.
 *
 * Anything user-scoped, anything that can be mutated by the reader, and every
 * write stays out. A cached identity or a cached basket is a correctness bug
 * wearing a performance fix.
 *
 * This map is module scope, which on the server means one cache for the whole
 * Node process rather than one per request. That is only acceptable because of
 * what the list contains: public editorial data, identical for every reader of
 * a given market, with the market header part of the key. Adding anything a
 * reader could see differently from another reader would make this a data leak,
 * not a cache — which is why the list is explicit rather than a heuristic on
 * the operation name.
 */

/** Editorial reference data. Read constantly, changed by Staff, never by the reader. */
const CACHEABLE_OPERATIONS = new Set<string>([
  "getMarkets",
  "getMarketsByCode",
  "getMarketsActive",
  "getMarketsEffectiveByCode",
  "getCurrencyCatalog",
  "getTaxonomyHeaderNavigation",
  "getTaxonomyV1Tree",
]);

/**
 * Long enough to collapse a page load and a client-side navigation into it,
 * short enough that a Staff edit shows up without anyone reloading.
 */
const TTL_MS = 60_000;

interface CacheEntry {
  /** Present while a request is in flight, so concurrent callers share it. */
  pending?: Promise<unknown>;
  /** Present once resolved, until `expiresAt`. */
  value?: unknown;
  expiresAt?: number;
}

const entries = new Map<string, CacheEntry>();

/**
 * Stable regardless of key order, because two callers writing the same request
 * with their object literals in a different order must still share it.
 */
function stableKey(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableKey).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableKey(record[key])}`)
    .join(",")}}`;
}

/**
 * The market header is part of the answer, not just the request: the same
 * operation returns different navigation for FR and BE, so it has to be part
 * of what makes two calls "the same call".
 */
export function referenceCacheKey(
  operationId: GeneratedApiOperationId,
  input: unknown,
): string {
  return `${operationId}:${stableKey(input)}`;
}

export function isCacheableOperation(
  operationId: GeneratedApiOperationId,
): boolean {
  return CACHEABLE_OPERATIONS.has(operationId);
}

/**
 * Runs `execute`, sharing the work with any identical call already in flight
 * and, for reference operations, with any identical call from the last minute.
 */
export function withReferenceCache<Result>(
  operationId: GeneratedApiOperationId,
  input: unknown,
  execute: () => Promise<Result>,
): Promise<Result> {
  const cacheable = isCacheableOperation(operationId);
  const key = referenceCacheKey(operationId, input);
  const existing = entries.get(key);
  const now = Date.now();

  if (existing?.pending) return existing.pending as Promise<Result>;
  if (
    cacheable &&
    existing &&
    existing.expiresAt !== undefined &&
    existing.expiresAt > now
  ) {
    return Promise.resolve(existing.value as Result);
  }

  const pending = execute().then(
    (value) => {
      if (cacheable)
        entries.set(key, { value, expiresAt: Date.now() + TTL_MS });
      // Single flight only: the entry existed to be shared while in flight,
      // and has nothing to say once it has landed.
      else entries.delete(key);
      return value;
    },
    (error: unknown) => {
      // A failure is never cached. The next reader gets a real attempt rather
      // than a minute of somebody else's error.
      entries.delete(key);
      throw error;
    },
  );
  entries.set(key, { pending });
  return pending;
}

/**
 * Drops everything. Called when the reader's market or session changes, and by
 * tests that must not inherit another test's answers.
 */
export function clearReferenceDataCache(): void {
  entries.clear();
}
