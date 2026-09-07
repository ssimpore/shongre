import type { MarketScopedSearchFilters } from "../contracts/search.contract";

type CanonicalSearchValue =
  string | number | boolean | readonly string[] | Record<string, unknown>;

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return [...value]
      .map(stableValue)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, nested]) => nested !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

/**
 * One canonical representation feeds the query cache key, GET URL and POST
 * fallback. Equivalent filter sets therefore deduplicate in the browser and
 * converge on the same CDN cache key.
 */
export function normalizeSearchFilters(
  input: MarketScopedSearchFilters,
): MarketScopedSearchFilters {
  const normalized: Record<string, CanonicalSearchValue> = {
    marketCode: input.marketCode.trim().toUpperCase(),
  };
  const textFields = [
    "query",
    "categorySlug",
    "subCategorySlug",
    "city",
    "postalCode",
    "sortBy",
    "cursor",
  ] as const;
  for (const field of textFields) {
    const value = input[field]?.trim();
    if (value) normalized[field] = value;
  }
  const numberFields = [
    "radiusKm",
    "minPrice",
    "maxPrice",
    "page",
    "limit",
  ] as const;
  for (const field of numberFields) {
    const value = input[field];
    if (value !== undefined && Number.isFinite(value))
      normalized[field] = value;
  }
  if (input.sellerType && input.sellerType !== "all") {
    normalized.sellerType = input.sellerType;
  }
  if (input.deliveryAvailable) normalized.deliveryAvailable = true;
  if (input.onlinePaymentAvailable) normalized.onlinePaymentAvailable = true;
  if (input.onlyDeals) normalized.onlyDeals = true;
  if (input.publishedToday) normalized.publishedToday = true;
  if (input.conditions?.length) {
    normalized.conditions = [...new Set(input.conditions)].sort();
  }
  if (input.attributes && Object.keys(input.attributes).length) {
    normalized.attributes = stableValue(input.attributes) as Record<
      string,
      unknown
    >;
  }
  return normalized as unknown as MarketScopedSearchFilters;
}

export function canonicalSearchKey(
  filters: MarketScopedSearchFilters,
): readonly ["marketplace-search", string] {
  return [
    "marketplace-search",
    JSON.stringify(normalizeSearchFilters(filters)),
  ];
}

export function canonicalSearchGetParams(
  input: MarketScopedSearchFilters,
): Record<string, string | number | boolean | undefined> {
  const { conditions, attributes, ...filters } = normalizeSearchFilters(input);
  const ordered = Object.fromEntries(
    Object.entries(filters).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  ) as Record<string, string | number | boolean | undefined>;
  if (conditions?.length) ordered.conditions = conditions.join(",");
  if (attributes && Object.keys(attributes).length) {
    ordered.attributes = JSON.stringify(attributes);
  }
  return ordered;
}

export function encodedSearchQueryLength(
  params: Record<string, string | number | boolean | undefined>,
): number {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.append(key, String(value));
  }
  return query.toString().length;
}
