import { normalizePlaceName } from "@shongre/contracts/place-gazetteer";

/**
 * Reducing what a person typed to something a cache key and a provider agree on.
 *
 * Two sellers writing "12 Rue de la Paix, 75002 PARIS" and "12 rue de la paix
 * 75002 paris" have written the same address, and geocoding it twice costs a
 * request against a rate limit that is shared by the whole platform. The
 * normalized form exists to make those two the same lookup.
 *
 * It deliberately does not try to be a parser. Address parsing is
 * country-specific and getting it subtly wrong produces a *plausible* wrong
 * answer, which is worse than passing the original through.
 */

const WHITESPACE = /\s+/g;
const PUNCTUATION_RUNS = /[,;]{2,}/g;

/** A single line, trimmed, with runs of whitespace and punctuation collapsed. */
export function normalizeAddressLine(value: string): string {
  return value
    .replace(WHITESPACE, " ")
    .replace(PUNCTUATION_RUNS, ",")
    .replace(/\s*,\s*/g, ", ")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .slice(0, 400);
}

export interface AddressQueryInput {
  query?: string | null;
  city?: string | null;
  postalCode?: string | null;
  countryCode: string;
}

/**
 * The cache key for a lookup.
 *
 * Case, accents and punctuation are folded because they do not change the
 * place; the country never is, because it decides which place a postcode names.
 */
export function addressCacheKey(input: AddressQueryInput): string {
  const parts = [
    input.countryCode.toUpperCase(),
    normalizePlaceName(input.query ?? ""),
    normalizePlaceName(input.city ?? ""),
    (input.postalCode ?? "").replace(/[^0-9a-zA-Z]/g, "").toLowerCase(),
  ];
  return parts.join("|");
}

/** What is actually sent upstream: one line, in the caller's own words. */
export function buildProviderQuery(input: AddressQueryInput): string {
  const written = [input.query, input.postalCode, input.city]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(", ");
  return normalizeAddressLine(written);
}

/**
 * Whether a query is worth sending.
 *
 * Two characters match a substantial fraction of any country, and every such
 * request costs the same rate-limit budget as a useful one.
 */
export function isSearchableAddressQuery(
  value: string,
  minLength = 3,
): boolean {
  return normalizeAddressLine(value).length >= minLength;
}
