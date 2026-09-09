/**
 * Public routes address resources by slug, while the database addresses them by
 * `uuid`. Comparing a slug against a `uuid` column is not a miss — PostgreSQL
 * raises `invalid input syntax for type uuid`, which `databaseFailure()` turns
 * into a 503. Repositories must therefore choose the column before querying.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** The column a caller-supplied identifier can safely be compared against. */
export function identifierColumn(
  idOrSlug: string,
  slugColumn = "slug",
): "id" | string {
  return isUuid(idOrSlug) ? "id" : slugColumn;
}
