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
  icon?: string;
  isSubCategory: boolean;
  categoryObj: Category;
}

export interface AutocompleteResults {
  categories: CategorySuggestion[];
  keywords: PopularSearchKeyword[];
  trending: PopularSearchKeyword[];
}

/**
 * Combines API-owned keyword suggestions with API-owned taxonomy nodes. This
 * helper intentionally contains no marketplace examples or popularity data.
 */
export function getSearchSuggestions(
  rawInput: string,
  _activeCategorySlug?: string,
  categories: readonly Category[] = [],
  limit = 5,
  keywordSuggestions: readonly string[] = [],
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
  const compactLabelFor = (node: {
    name: string;
    label?: string;
    shortLabel?: string;
  }) => node.shortLabel || node.label || node.name;

  categories.forEach((category) => {
    const compactLabel = compactLabelFor(category);
    if (
      category.name.toLowerCase().includes(query) ||
      category.slug.toLowerCase().includes(query) ||
      compactLabel.toLowerCase().includes(query)
    ) {
      matchedCategories.push({
        id: category.id,
        name: category.name,
        slug: category.slug,
        compactLabel,
        isSubCategory: false,
        categoryObj: category,
      });
    }

    category.subCategories?.forEach((subcategory) => {
      const subcategoryLabel = compactLabelFor(subcategory);
      if (
        subcategory.name.toLowerCase().includes(query) ||
        subcategory.slug.toLowerCase().includes(query) ||
        subcategoryLabel.toLowerCase().includes(query)
      ) {
        matchedCategories.push({
          id: subcategory.id,
          name: subcategory.name,
          slug: subcategory.slug,
          compactLabel: subcategoryLabel,
          parentName: compactLabel,
          parentSlug: category.slug,
          isSubCategory: true,
          categoryObj: category,
        });
      }
    });
  });

  const keywords = keywordSuggestions
    .filter((keyword) => keyword.toLowerCase().includes(query))
    .slice(0, limit)
    .map((keyword) => ({ keyword }));

  return {
    categories: matchedCategories.slice(0, limit),
    keywords,
    trending,
  };
}
