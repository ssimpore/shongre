/**
 * Text folding for every search comparison in the product.
 *
 * French shoppers type without accents — phone keyboards barely offer them —
 * so a bare `toLowerCase()` made `velo` return nothing while `vélo` returned
 * results, and `cafe` miss a listing titled "Machine à Café Espresso". Worse,
 * the header autocomplete appeared to work only because it fell through to
 * matching on slugs, which are already ASCII: it offered a category the results
 * page then refused to deliver.
 *
 * NFD splits an accented character into its base letter plus a combining mark;
 * dropping the marks leaves the base letter. Ligatures that are not
 * decomposable (œ, æ, ß) are mapped by hand, and the German ß is folded to `ss`
 * the way search engines do rather than being dropped.
 */
const LIGATURES: Record<string, string> = {
  œ: "oe",
  æ: "ae",
  ø: "o",
  ß: "ss",
  đ: "d",
  ł: "l",
};

export function normalizeSearchText(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .toLowerCase()
    .replace(/[œæøßđł]/g, (char) => LIGATURES[char] ?? char)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when `haystack` contains `needle`, ignoring case, accents and spacing. */
export function searchTextIncludes(
  haystack: string | null | undefined,
  normalizedNeedle: string,
): boolean {
  if (!normalizedNeedle) return true;
  return normalizeSearchText(haystack).includes(normalizedNeedle);
}

/**
 * Explicit marketplace vocabulary bridge for renamed business dimensions.
 * Individual Course wording remains searchable and semantically unchanged.
 */
export function expandSearchQuery(value: string): string[] {
  const normalized = normalizeSearchText(value);
  const variants = new Set([normalized]);
  if (/\beducation\b/.test(normalized)) {
    variants.add(normalized.replace(/\beducation\b/g, "cours"));
    variants.add(normalized.replace(/\beducation\b/g, "formation"));
  }
  if (/\bmaths\b/.test(normalized)) {
    variants.add(normalized.replace(/\bmaths\b/g, "mathematiques"));
    variants.add("mathematiques");
  }
  return [...variants].filter(Boolean);
}
