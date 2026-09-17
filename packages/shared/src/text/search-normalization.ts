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

/**
 * The function words `public.listing_search_stopwords()` drops when the
 * catalogue vocabulary is built (migration 00142). Kept identical so the
 * in-memory fixture suggests and corrects exactly what production would.
 */
export const SEARCH_VOCABULARY_STOPWORDS: ReadonlySet<string> = new Set([
  "le",
  "la",
  "les",
  "de",
  "des",
  "du",
  "un",
  "une",
  "et",
  "ou",
  "en",
  "au",
  "aux",
  "avec",
  "pour",
  "sur",
  "par",
  "dans",
  "sans",
  "sous",
  "chez",
  "vers",
  "ce",
  "cet",
  "cette",
  "ces",
  "son",
  "sa",
  "ses",
  "mon",
  "ma",
  "mes",
  "ton",
  "ta",
  "tes",
  "que",
  "qui",
  "quoi",
  "dont",
  "est",
  "sont",
  "the",
  "and",
  "for",
  "with",
  "of",
]);

/**
 * The vocabulary words of one catalogue text, keyed like
 * `public.listing_search_terms_from_text`: lower-cased, split on anything
 * that is not a letter or digit, at least one letter, two to forty
 * characters, minus stopwords. `term` is the unaccented key, `label` the
 * catalogue's own spelling.
 */
export function searchVocabularyTerms(
  text: string,
): Array<{ term: string; label: string }> {
  const seen = new Map<string, string>();
  for (const word of text.toLocaleLowerCase("fr-FR").split(/[^\p{L}\p{N}]+/u)) {
    if (word.length < 2 || word.length > 40 || !/\p{L}/u.test(word)) continue;
    const term = foldDiacritics(word);
    if (SEARCH_VOCABULARY_STOPWORDS.has(term) || seen.has(term)) continue;
    seen.set(term, word);
  }
  return Array.from(seen, ([term, label]) => ({ term, label }));
}

function trigrams(value: string): Set<string> {
  // pg_trgm pads each word with two leading and one trailing space, so a
  // word's first letters weigh more than its middle — the same bias the
  // database applies when it ranks corrections.
  const grams = new Set<string>();
  for (const word of foldDiacritics(value)
    .toLocaleLowerCase("fr-FR")
    .split(/[^\p{L}\p{N}]+/u)) {
    if (!word) continue;
    const padded = `  ${word} `;
    for (let index = 0; index + 3 <= padded.length; index += 1) {
      grams.add(padded.slice(index, index + 3));
    }
  }
  return grams;
}

/**
 * `pg_trgm`'s `similarity()`: shared trigrams over the union of trigrams,
 * between 0 and 1. Used where the fixture repository has to rank the same
 * way the database does.
 */
export function trigramSimilarity(left: string, right: string): number {
  const leftGrams = trigrams(left);
  const rightGrams = trigrams(right);
  if (!leftGrams.size || !rightGrams.size) return 0;
  let shared = 0;
  for (const gram of leftGrams) if (rightGrams.has(gram)) shared += 1;
  const union = leftGrams.size + rightGrams.size - shared;
  return union ? shared / union : 0;
}
