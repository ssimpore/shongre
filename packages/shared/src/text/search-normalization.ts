/**
 * One definition of "the same word" for search.
 *
 * The catalogue's PostgreSQL search vectors are built with `unaccent()` and the
 * locale-neutral `simple` dictionary, and the query side folds diacritics
 * before it is handed to `websearch_to_tsquery`. Any in-memory matcher has to
 * fold the same way or it answers a different question than production does —
 * which is exactly how "cafe finds what café finds" became a known failure
 * against the fixture repository while the database path was already correct.
 */

/** Strips combining marks without touching case, spacing or punctuation. */
export function foldDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Folds a string to the comparable form used for relevance and in-memory
 * matching: no diacritics, lower case, and punctuation collapsed to single
 * spaces so `Sézane, Paris` and `sezane paris` compare equal.
 */
export function normalizeSearchText(value: string): string {
  return foldDiacritics(value)
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
