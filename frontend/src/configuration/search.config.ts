import type { SearchSuggestion } from "../api/contracts/search.contract";
import type { Category } from "../types";

/** Shared search copy for wide and compact search controls. */
export const SEARCH_PLACEHOLDER = {
  full: "Que recherchez-vous ? (ex : vélo gravel, iPhone 15, canapé chêne…)",
  compact: "Que recherchez-vous ?",
} as const;

export interface PopularSearchKeyword {
  keyword: string;
  categorySlug?: string;
  categoryName?: string;
  subCategorySlug?: string;
  isTrending?: boolean;
}

export interface CategorySuggestion {
  id: string;
  name: string;
  slug: string;
  compactLabel: string;
  parentName?: string;
  parentSlug?: string;
  iconName?: string;
  isSubCategory: boolean;
}

export interface AutocompleteResults {
  categories: CategorySuggestion[];
  keywords: PopularSearchKeyword[];
  trending: PopularSearchKeyword[];
}

/**
 * Combines the API's ranked completions with the taxonomy projection already
 * loaded for the category picker. The API owns matching: its completions are
 * not re-filtered here, because a corrected word ("vélo" for "velo") would
 * not survive a naive substring test. This helper intentionally contains no
 * marketplace examples or popularity data.
 */
export function getSearchSuggestions(
  rawInput: string,
  _activeCategorySlug?: string,
  categories: readonly Category[] = [],
  limit = 5,
  apiSuggestions: readonly SearchSuggestion[] = [],
  popularKeywords: readonly string[] = [],
): AutocompleteResults {
  const query = rawInput.trim().toLowerCase();
  const trending = popularKeywords.slice(0, 4).map((keyword) => ({
    keyword,
    isTrending: true,
  }));

  if (!query) {
    return { categories: [], keywords: [], trending };
  }

  const matchedCategories: CategorySuggestion[] = [];
  const seenCategorySlugs = new Set<string>();
  const pushCategory = (suggestion: CategorySuggestion) => {
    if (seenCategorySlugs.has(suggestion.slug)) return;
    seenCategorySlugs.add(suggestion.slug);
    matchedCategories.push(suggestion);
  };
  const compactLabelFor = (node: {
    name: string;
    label?: string;
    shortLabel?: string;
  }) => node.shortLabel || node.label || node.name;

  for (const suggestion of apiSuggestions) {
    if (suggestion.kind !== "category") continue;
    pushCategory({
      id: suggestion.categoryId,
      name: suggestion.label,
      slug: suggestion.categorySlug,
      compactLabel: suggestion.label,
      parentName: suggestion.parentLabel,
      parentSlug: suggestion.parentSlug,
      iconName: suggestion.iconName,
      isSubCategory: Boolean(suggestion.parentSlug),
    });
  }

  categories.forEach((category) => {
    const compactLabel = compactLabelFor(category);
    if (
      category.name.toLowerCase().includes(query) ||
      category.slug.toLowerCase().includes(query) ||
      compactLabel.toLowerCase().includes(query)
    ) {
      pushCategory({
        id: category.id,
        name: category.name,
        slug: category.slug,
        compactLabel,
        iconName: category.iconName,
        isSubCategory: false,
      });
    }

    category.subCategories?.forEach((subcategory) => {
      const subcategoryLabel = compactLabelFor(subcategory);
      if (
        subcategory.name.toLowerCase().includes(query) ||
        subcategory.slug.toLowerCase().includes(query) ||
        subcategoryLabel.toLowerCase().includes(query)
      ) {
        pushCategory({
          id: subcategory.id,
          name: subcategory.name,
          slug: subcategory.slug,
          compactLabel: subcategoryLabel,
          parentName: compactLabel,
          parentSlug: category.slug,
          iconName: subcategory.iconName ?? category.iconName,
          isSubCategory: true,
        });
      }
    });
  });

  const keywords = apiSuggestions
    .flatMap((suggestion) =>
      suggestion.kind === "term" ? [{ keyword: suggestion.query }] : [],
    )
    .slice(0, limit);

  return {
    categories: matchedCategories.slice(0, limit),
    keywords,
    trending,
  };
}
