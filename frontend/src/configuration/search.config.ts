import { TAXONOMY } from "../domains/taxonomy/taxonomy.data";
import { getTaxonomyLabel } from "../domains/taxonomy/taxonomy.service";
import { Category } from "../types";

/**
 * Shared search copy.
 *
 * Search appears on four surfaces (desktop header, homepage hero, the search page
 * itself, and the mobile drawer). Each had its own placeholder wording, so the
 * same action was described four different ways. The wording lives here so the
 * surfaces stay consistent; only the length varies with the available width.
 */
export const SEARCH_PLACEHOLDER = {
  /** Wide surfaces: header, hero, search page. */
  full: "Que recherchez-vous ? (ex : vélo gravel, iPhone 15, canapé chêne…)",
  /** Narrow surfaces: mobile drawer, compact filter bars. */
  compact: "Que recherchez-vous ?",
} as const;

export interface PopularSearchKeyword {
  keyword: string;
  categorySlug?: string;
  categoryName?: string;
  subCategorySlug?: string;
  isTrending?: boolean;
}

export const POPULAR_SEARCH_KEYWORDS: PopularSearchKeyword[] = [
  // Véhicules & Mobilité
  {
    keyword: "Vélo gravel",
    categorySlug: "loisirs",
    subCategorySlug: "loisirs.velos",
    isTrending: true,
  },
  {
    keyword: "Vélo électrique urbain",
    categorySlug: "loisirs",
    subCategorySlug: "loisirs.velos",
  },
  {
    keyword: "Peugeot 208",
    categorySlug: "vehicules",
    subCategorySlug: "vehicles.cars",
    isTrending: true,
  },
  {
    keyword: "Renault Clio V",
    categorySlug: "vehicules",
    subCategorySlug: "vehicles.cars",
  },
  {
    keyword: "Volkswagen Golf",
    categorySlug: "vehicules",
    subCategorySlug: "vehicles.cars",
  },
  {
    keyword: "Scooter 125cc",
    categorySlug: "vehicules",
    subCategorySlug: "vehicles.motorcycles",
  },
  {
    keyword: "BMW Série 1",
    categorySlug: "vehicules",
    subCategorySlug: "vehicles.cars",
  },

  // Tech & Multimédia
  {
    keyword: "iPhone 15 Pro",
    categorySlug: "multimedia",
    subCategorySlug: "multimedia.smartphones",
    isTrending: true,
  },
  {
    keyword: "iPhone 14 128Go",
    categorySlug: "multimedia",
    subCategorySlug: "multimedia.smartphones",
  },
  {
    keyword: "MacBook Pro M3",
    categorySlug: "multimedia",
    subCategorySlug: "multimedia.computers",
    isTrending: true,
  },
  {
    keyword: "PlayStation 5",
    categorySlug: "multimedia",
    subCategorySlug: "multimedia.gaming",
    isTrending: true,
  },
  {
    keyword: "Nintendo Switch OLED",
    categorySlug: "multimedia",
    subCategorySlug: "multimedia.gaming",
  },
  {
    keyword: "iPad Air M2",
    categorySlug: "multimedia",
    subCategorySlug: "multimedia.computers",
  },
  {
    keyword: "Casque Sony WH-1000XM5",
    categorySlug: "multimedia",
    subCategorySlug: "multimedia.audio",
  },

  // Maison & Jardin
  {
    keyword: "Canapé d’angle convertible",
    categorySlug: "maison",
    subCategorySlug: "maison.mobilier",
    isTrending: true,
  },
  {
    keyword: "Table chêne massif",
    categorySlug: "maison",
    subCategorySlug: "maison.mobilier",
  },
  {
    keyword: "Buffet enfilade vintage",
    categorySlug: "maison",
    subCategorySlug: "maison.mobilier",
  },
  {
    keyword: "Tondeuse thermique autoportée",
    categorySlug: "maison",
    subCategorySlug: "maison.bricolage",
  },
  {
    keyword: "Perceuse sans fil Bosch",
    categorySlug: "maison",
    subCategorySlug: "maison.bricolage",
  },
  {
    keyword: "Plafonnier design scandinave",
    categorySlug: "maison",
    subCategorySlug: "maison.deco",
  },

  // Immobilier
  {
    keyword: "Appartement T3 avec balcon",
    categorySlug: "immobilier",
    subCategorySlug: "real_estate.sales",
    isTrending: true,
  },
  {
    keyword: "Maison avec jardin",
    categorySlug: "immobilier",
    subCategorySlug: "real_estate.sales",
  },
  {
    keyword: "Studio meublé centre ville",
    categorySlug: "immobilier",
    subCategorySlug: "real_estate.rentals",
  },

  // Mode & Accessoires
  {
    keyword: "Montre Seiko automatique",
    categorySlug: "mode",
    subCategorySlug: "mode.accessoires",
    isTrending: true,
  },
  {
    keyword: "Veste Barbour vintage",
    categorySlug: "mode",
    subCategorySlug: "mode.vetements-homme",
  },
  {
    keyword: "Sneakers Nike Dunk",
    categorySlug: "mode",
    subCategorySlug: "mode.chaussures",
    isTrending: true,
  },
  {
    keyword: "Manteau en laine mérinos",
    categorySlug: "mode",
    subCategorySlug: "mode.vetements-femme",
  },

  // Loisirs & Matériel
  {
    keyword: "Guitare acoustique Yamaha",
    categorySlug: "loisirs",
    subCategorySlug: "loisirs.musique",
  },
  {
    keyword: "Poussette Cybex compacte",
    categorySlug: "loisirs",
    subCategorySlug: "loisirs.puericulture",
    isTrending: true,
  },
  {
    keyword: "Planche de surf hybride",
    categorySlug: "loisirs",
    subCategorySlug: "loisirs.sport",
  },
  {
    keyword: "Set Lego Star Wars collector",
    categorySlug: "loisirs",
    subCategorySlug: "loisirs.jeux",
  },
];

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
  /** Matched taxonomy categories and subcategories */
  categories: CategorySuggestion[];
  /** Matched keywords from trending/popular registry */
  keywords: PopularSearchKeyword[];
  /** Default recommended trending searches when input is blank */
  trending: PopularSearchKeyword[];
}

/**
 * Resolves search autocomplete suggestions given an input string and optional active category.
 */
export function getSearchSuggestions(
  rawInput: string,
  activeCategorySlug?: string,
  limit = 5,
): AutocompleteResults {
  const query = rawInput.trim().toLowerCase();

  // Top trending defaults
  const trending = POPULAR_SEARCH_KEYWORDS.filter((k) => k.isTrending).slice(
    0,
    4,
  );

  if (!query) {
    return {
      categories: [],
      keywords: [],
      trending,
    };
  }

  // 1. Search in Categories and Subcategories
  const matchedCategories: CategorySuggestion[] = [];

  TAXONOMY.forEach((cat) => {
    const catNameLower = cat.name.toLowerCase();
    const catSlugLower = cat.slug.toLowerCase();
    const compactLabel = getTaxonomyLabel(cat, "compact");
    const compactLower = compactLabel.toLowerCase();

    // Match parent category
    if (
      catNameLower.includes(query) ||
      catSlugLower.includes(query) ||
      compactLower.includes(query)
    ) {
      matchedCategories.push({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        compactLabel,
        isSubCategory: false,
        categoryObj: cat,
      });
    }

    // Match subcategories
    if (cat.subCategories && cat.subCategories.length > 0) {
      cat.subCategories.forEach((sub) => {
        const subNameLower = sub.name.toLowerCase();
        const subSlugLower = sub.slug.toLowerCase();
        const subCompactLabel = getTaxonomyLabel(sub, "compact");
        const subCompactLower = subCompactLabel.toLowerCase();

        if (
          subNameLower.includes(query) ||
          subSlugLower.includes(query) ||
          subCompactLower.includes(query)
        ) {
          matchedCategories.push({
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
            compactLabel: subCompactLabel,
            parentName: getTaxonomyLabel(cat, "compact"),
            parentSlug: cat.slug,
            isSubCategory: true,
            categoryObj: cat,
          });
        }
      });
    }
  });

  // 2. Search in Popular Keywords
  let matchedKeywords = POPULAR_SEARCH_KEYWORDS.filter((item) =>
    item.keyword.toLowerCase().includes(query),
  );

  // If an active category is set, prioritize keywords in that category
  if (activeCategorySlug) {
    matchedKeywords.sort((a, b) => {
      const aMatch = a.categorySlug === activeCategorySlug ? 1 : 0;
      const bMatch = b.categorySlug === activeCategorySlug ? 1 : 0;
      return bMatch - aMatch;
    });
  }

  return {
    categories: matchedCategories.slice(0, limit),
    keywords: matchedKeywords.slice(0, limit),
    trending,
  };
}
