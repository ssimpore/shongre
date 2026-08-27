import { PAGE_SIZES } from "../../configuration/pagination.config";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import {
  SlidersHorizontal,
  Bookmark,
  ArrowUpDown,
  Tag,
  PanelLeftClose,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  MarketScopedSearchFilters,
  SearchFacetValue,
} from "../../api/contracts/search.contract";
import { services } from "../../api/client/service-registry";
import { Listing, SearchFilters, ListingCondition } from "../../types";
import { TAXONOMY } from "../../domains/taxonomy/taxonomy.data";
import {
  taxonomyService,
  getTaxonomyLabel,
} from "../../domains/taxonomy/taxonomy.service";
import { TaxonomyMigration } from "../../domains/taxonomy/taxonomy.migration";
import { usePageMeta } from "../../hooks/usePageMeta";
import { ListingCard } from "../../design-system/primitives/ListingCard";
import { Button } from "../../design-system/primitives/Button";
import { Input, Checkbox } from "../../design-system/primitives/FormField";
import { Drawer } from "../../design-system/primitives/Modal";
import { plural } from "../../utilities/formatters";
import {
  ListingCardSkeleton,
  FilterPanel,
  ListingGrid,
  Skeleton,
  StatePanel,
} from "../../design-system";
import { NoResultsFound } from "../../design-system/primitives/NoResultsFound";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { storageService } from "../../services/storage.service";
import { analyticsService } from "../../services/analytics.service";
import { CategoryIcon } from "../../design-system/primitives/CategoryIcon";
import { FilterChip } from "../../design-system/primitives/FilterChip";
import { GlobalSearchBar } from "../../design-system/primitives/GlobalSearchBar";
import {
  DropdownMenu,
  DropdownOption,
} from "../../design-system/primitives/DropdownMenu";
import { PriceRangeSlider } from "../../design-system/primitives/PriceRangeSlider";
import { ViewModeToggle } from "../../design-system/primitives/ViewModeToggle";
import { useTranslation } from "../../i18n/I18nProvider";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../../design-system/utils/controlMetrics";

// Leaflet is the heaviest optional frontend dependency. Keep it outside the
// normal search bundle so grid/list browsing does not download a map engine or
// its stylesheet until the visitor explicitly chooses the map view.
const ExploreMapView = React.lazy(() =>
  import("./ExploreMapView").then((module) => ({
    default: module.ExploreMapView,
  })),
);

/* The tiers that actually appear on goods listings. `not_applicable` is left
   out on purpose: it is a storage value for services, jobs and rentals, and it
   is no longer shown to buyers anywhere. */
const CONDITION_FILTER_OPTIONS: { value: ListingCondition; label: string }[] = [
  { value: "new_with_tag", label: "Neuf avec étiquette" },
  { value: "new_without_tag", label: "Neuf sans étiquette" },
  { value: "very_good", label: "Très bon état" },
  { value: "good", label: "Bon état" },
  { value: "fair", label: "État correct" },
  { value: "for_parts", label: "Pour pièces" },
];

function deleteAttributeFilters(params: URLSearchParams): void {
  Array.from(params.keys()).forEach((key) => {
    if (key.startsWith("attr_")) params.delete(key);
  });
}

function humanizeFacetValue(value: string): string {
  return value.replace(/_/g, " ").replace(/^./, (first) => first.toUpperCase());
}

export const SearchPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    location: userLocation,
    resetLocation,
    activeMarket,
    currentLocale,
    currencySymbol,
  } = useMarketLocation();
  const toast = useToast();
  const formatPriceBound = (value: number) =>
    `${value.toLocaleString(currentLocale)} ${currencySymbol}`;

  const urlViewParam = searchParams.get("view") as
    "grid" | "list" | "map" | null;
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">(
    urlViewParam === "map" || urlViewParam === "list" ? urlViewParam : "grid",
  );
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [attributeFacetValues, setAttributeFacetValues] = useState<
    Record<string, SearchFacetValue[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchError, setSearchError] = useState(false);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const lastStartedSearchKey = useRef<string | null>(null);

  /* `/categorie/:categorySlug` is the pretty, linkable form of a category
     search. The route was registered but nothing ever read its parameter, so
     every category landing page rendered the entire unfiltered catalogue under
     the heading "Toutes les annonces" — the primary organic entry point for a
     classifieds site, showing the wrong results. It went unnoticed because the
     in-app category navigation all links to `/recherche?category=`, so nothing
     in the UI reached the broken route.

     The slug is seeded into the query string once per category rather than read
     as a second source of truth: every filter control already reads and writes
     `?category=`, and clearing the category deletes the key. A route parameter
     consulted as a fallback would silently reinstate the category the user just
     cleared. Seeding once means the existing filter logic keeps working
     untouched, and the pretty URL still selects the right category on arrival. */
  const { categorySlug: categoryRouteSlug } = useParams<{
    categorySlug?: string;
  }>();
  const seededCategoryFor = useRef<string | null>(null);

  useEffect(() => {
    if (!categoryRouteSlug) return;
    if (seededCategoryFor.current === categoryRouteSlug) return;
    seededCategoryFor.current = categoryRouteSlug;
    if (searchParams.get("category") === categoryRouteSlug) return;

    const next = new URLSearchParams(searchParams);
    next.set("category", categoryRouteSlug);
    setSearchParams(next, { replace: true });
  }, [categoryRouteSlug, searchParams, setSearchParams]);

  // Extract filter params from URL
  const query = searchParams.get("query") || "";
  const categorySlug = searchParams.get("category") || "";
  const subCategorySlug = searchParams.get("subCategory") || "";
  const cityParam = searchParams.get("city");
  // Only filter by city if the URL specifically specifies an active, non-countrywide city query parameter
  const city =
    cityParam &&
    !cityParam.startsWith("Tout") &&
    !cityParam.startsWith("Toute") &&
    cityParam !== "all"
      ? cityParam
      : "";
  const radiusKm = searchParams.get("radius")
    ? Number(searchParams.get("radius"))
    : userLocation.radiusKm || 30;
  const minPrice = searchParams.get("minPrice")
    ? Number(searchParams.get("minPrice"))
    : undefined;
  const maxPrice = searchParams.get("maxPrice")
    ? Number(searchParams.get("maxPrice"))
    : undefined;
  const sellerType = (searchParams.get("sellerType") as any) || "all";
  const delivery = searchParams.get("delivery") === "true";
  const onlinePayment = searchParams.get("onlinePayment") === "true";
  const onlyDeals = searchParams.get("onlyDeals") === "true";
  /* Condition is printed on every result card and is a top-three facet for a
     marketplace, but nothing exposed it — the repository has honoured
     `filters.conditions` all along. Comma-separated so one param carries a
     multi-select and the URL stays shareable. */
  const conditions = (searchParams.get("condition") || "")
    .split(",")
    .filter(Boolean) as ListingCondition[];
  const sortBy = (searchParams.get("sortBy") as any) || "date_desc";
  const marketCode =
    searchParams.get("market") ||
    storageService.getActiveMarketCode() ||
    activeMarket.code;
  const pageParam = Number(searchParams.get("page") || "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const dynamicAttributeFilters = useMemo(() => {
    const values: SearchFilters["attributes"] = {};
    const keys = new Set(
      [...searchParams.keys()]
        .filter((param) => param.startsWith("attr_"))
        .map((param) => param.replace(/^attr_/, "").replace(/_(min|max)$/, "")),
    );
    keys.forEach((key) => {
      const min = searchParams.get(`attr_${key}_min`);
      const max = searchParams.get(`attr_${key}_max`);
      const value = searchParams.get(`attr_${key}`);
      if (min !== null || max !== null) {
        values[key] = {
          min: min ? Number(min) : undefined,
          max: max ? Number(max) : undefined,
        };
      } else if (value !== null && value !== "") {
        values[key] = value.includes(",")
          ? value.split(",").filter(Boolean)
          : value;
      }
    });
    return values;
  }, [searchParams]);

  // Temporary filter state for mobile drawer / inputs
  const [, setTempQuery] = useState(query);

  useEffect(() => {
    setTempQuery(query);
  }, [query]);

  // Execute search query
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setSearchError(false);
    const filters: MarketScopedSearchFilters = {
      query: query || undefined,
      categorySlug: categorySlug || undefined,
      subCategorySlug: subCategorySlug || undefined,
      city: city || undefined,
      radiusKm,
      minPrice,
      maxPrice,
      sellerType: sellerType as any,
      deliveryAvailable: delivery || undefined,
      onlinePaymentAvailable: onlinePayment || undefined,
      onlyDeals: onlyDeals || undefined,
      conditions: conditions.length > 0 ? conditions : undefined,
      attributes:
        Object.keys(dynamicAttributeFilters).length > 0
          ? dynamicAttributeFilters
          : undefined,
      sortBy,
      marketCode,
      page,
      limit: PAGE_SIZES.marketplaceSearch,
    };

    const startedSearchKey = JSON.stringify({ filters, searchAttempt });
    if (lastStartedSearchKey.current !== startedSearchKey) {
      lastStartedSearchKey.current = startedSearchKey;
      analyticsService.track("search_started", {
        query: query || undefined,
        categoryId: categorySlug || undefined,
        filterKeys: [
          minPrice !== undefined ? "minPrice" : "",
          maxPrice !== undefined ? "maxPrice" : "",
          sellerType ? "sellerType" : "",
          delivery ? "delivery" : "",
        ].filter(Boolean),
        sort: sortBy,
        radiusKm,
      });
    }

    services.search
      .search(filters)
      .then((res) => {
        if (cancelled) return;
        setListings(res.items);
        setTotalCount(res.total);
        setTotalPages(res.totalPages);
        setAttributeFacetValues(res.facets?.attributes || {});
        analyticsService.track("search_performed", {
          query: query || undefined,
          categoryId: categorySlug || undefined,
          resultCount: res.total,
          zeroResults: res.total === 0,
          sort: sortBy,
          radiusKm,
        });

        if (page > res.totalPages) {
          setSearchParams(
            (previous) => {
              const next = new URLSearchParams(previous);
              if (res.totalPages <= 1) next.delete("page");
              else next.set("page", String(res.totalPages));
              return next;
            },
            { replace: true },
          );
        }
      })
      .catch(() => {
        if (cancelled) return;
        setListings([]);
        setTotalCount(0);
        setTotalPages(1);
        setAttributeFacetValues({});
        setSearchError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    if (query) {
      storageService.addRecentSearch(query);
    }
    return () => {
      cancelled = true;
    };
  }, [
    query,
    categorySlug,
    subCategorySlug,
    city,
    radiusKm,
    minPrice,
    maxPrice,
    sellerType,
    delivery,
    onlinePayment,
    onlyDeals,
    conditions.join(","),
    JSON.stringify(dynamicAttributeFilters),
    sortBy,
    marketCode,
    page,
    searchAttempt,
    setSearchParams,
  ]);

  const toggleCondition = (value: ListingCondition) => {
    const next = conditions.includes(value)
      ? conditions.filter((c) => c !== value)
      : [...conditions, value];
    updateFilter("condition", next.length > 0 ? next.join(",") : undefined);
  };

  const updateFilter = (key: string, value: string | undefined) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === undefined || value === "" || value === "all") {
        next.delete(key);
        if (key === "category") {
          next.delete("subCategory");
        }
      } else {
        next.set(key, value);
        if (key === "category") {
          next.delete("subCategory");
        }
      }
      if (key === "category" || key === "subCategory") {
        deleteAttributeFilters(next);
      }
      next.delete("page");
      return next;
    });
  };

  const updatePage = (nextPage: number) => {
    const boundedPage = Math.min(totalPages, Math.max(1, nextPage));
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (boundedPage <= 1) next.delete("page");
      else next.set("page", String(boundedPage));
      return next;
    });
    requestAnimationFrame(() => {
      document
        .getElementById("search-results-toolbar")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handlePriceChange = ({ min, max }: { min?: number; max?: number }) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (min !== undefined) next.set("minPrice", String(min));
      else next.delete("minPrice");
      if (max !== undefined) next.set("maxPrice", String(max));
      else next.delete("maxPrice");
      next.delete("page");
      return next;
    });
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
    setTempQuery("");
    resetLocation();
  };

  const handleSaveSearch = () => {
    const title = query
      ? `Recherche "${query}"`
      : categorySlug
        ? `Catégorie ${categorySlug}`
        : "Ma recherche personnalisée";
    storageService.saveSearch({
      id: `ss-${Date.now()}`,
      title,
      filters: { query, categorySlug, city, minPrice, maxPrice },
      createdAt: new Date().toISOString(),
      hasNotifications: true,
      matchCount: totalCount,
    });
    toast.success(
      `La recherche "${title}" a été enregistrée avec alertes activées.`,
      "Recherche sauvegardée",
    );
  };

  const activeCanonicalNode = TaxonomyMigration.resolveCanonicalNode(
    subCategorySlug || categorySlug,
  );
  const activeCategory = TAXONOMY.find(
    (c) => c.slug === categorySlug || c.id === categorySlug,
  );
  const activeSubCat = activeCategory?.subCategories.find(
    (s) => s.slug === subCategorySlug || s.id === subCategorySlug,
  );
  const activeNodeId =
    activeCanonicalNode?.id || activeSubCat?.id || activeCategory?.id;

  // A search is useful on the home page only if it can be resumed with the
  // same criteria. Store the structured URL after every meaningful search or
  // filter change; the homepage listens for the storage event and updates the
  // cards immediately when this happens in the same tab.
  useEffect(() => {
    const hasAttributeFilters = [...searchParams.keys()].some((key) =>
      key.startsWith("attr_"),
    );
    const hasCriteria = Boolean(
      query.trim() ||
      categorySlug ||
      subCategorySlug ||
      city ||
      minPrice !== undefined ||
      maxPrice !== undefined ||
      sellerType !== "all" ||
      delivery ||
      onlinePayment ||
      onlyDeals ||
      conditions.length > 0 ||
      hasAttributeFilters,
    );
    if (!hasCriteria) return;

    const recentUrlParams = new URLSearchParams(searchParams.toString());
    recentUrlParams.delete("page");
    recentUrlParams.delete("view");

    storageService.addRecentSearchItem({
      title:
        query.trim() ||
        activeSubCat?.name ||
        activeCategory?.name ||
        t("search.searchPage.recherchePersonnalisee"),
      locationLabel: city || userLocation.city || activeMarket.name,
      categorySlug:
        activeSubCat?.slug || activeCategory?.slug || categorySlug || undefined,
      query: query.trim() || undefined,
      to: `/recherche?${recentUrlParams.toString()}`,
    });
  }, [
    activeCategory?.name,
    activeCategory?.slug,
    activeMarket.name,
    activeSubCat?.name,
    activeSubCat?.slug,
    categorySlug,
    city,
    conditions.length,
    delivery,
    maxPrice,
    minPrice,
    onlinePayment,
    onlyDeals,
    query,
    searchParams,
    sellerType,
    subCategorySlug,
    t,
    userLocation.city,
  ]);

  const dynamicFacets = useMemo(() => {
    return taxonomyService.resolveSearchFilters(activeNodeId);
  }, [activeNodeId]);

  const dynamicFacetDropdownOptions = useMemo(() => {
    return Object.fromEntries(
      dynamicFacets.map((facet) => {
        const { attribute } = facet;
        const discovered = attributeFacetValues[attribute.code] || [];
        const discoveredCounts = new Map(
          discovered.map((value) => [value.value, value.count]),
        );
        const declared = attribute.options?.map((option) => ({
          value: option.value,
          label: option.label,
        }));
        const values =
          declared && declared.length > 0
            ? declared
            : discovered.map((value) => ({
                value: value.value,
                label: humanizeFacetValue(value.value),
              }));
        const current = searchParams.get(`attr_${attribute.code}`);
        if (current && !values.some((value) => value.value === current)) {
          values.push({ value: current, label: humanizeFacetValue(current) });
        }

        const options: DropdownOption[] = [
          { value: "", label: "Tous / Toutes" },
          ...values.map((value) => {
            const count = discoveredCounts.get(value.value);
            return {
              ...value,
              sublabel:
                count === undefined ? undefined : plural(count, "annonce"),
            };
          }),
        ];
        return [attribute.code, options];
      }),
    ) as Record<string, DropdownOption[]>;
  }, [attributeFacetValues, dynamicFacets, searchParams]);

  const categoryDropdownOptions: DropdownOption[] = useMemo(
    () => [
      {
        value: "",
        label: "Toutes les catégories",
        icon: <Layers className="w-icon-sm h-icon-sm text-stone-500" />,
      },
      ...TAXONOMY.map((cat) => ({
        value: cat.slug,
        label: getTaxonomyLabel(cat, "compact"),
        icon: <CategoryIcon category={cat} size="xs" />,
        sublabel: `${cat.subCategories.length} sous-catégories`,
      })),
    ],
    [],
  );

  const subcategoryDropdownOptions: DropdownOption[] = useMemo(() => {
    const activeNode = categorySlug
      ? TaxonomyMigration.resolveCanonicalNode(categorySlug)
      : undefined;
    const children = activeNode
      ? taxonomyService.getChildren(activeNode.id)
      : [];
    if (children.length === 0) return [];
    return [
      { value: "", label: "Toutes les sous-catégories" },
      ...children.map((sub) => ({
        value: sub.slug,
        label: getTaxonomyLabel(sub, "compact"),
      })),
    ];
  }, [categorySlug]);

  const sortDropdownOptions: DropdownOption[] = [
    { value: "date_desc", label: "Plus récentes" },
    { value: "price_asc", label: "Prix : croissant" },
    { value: "price_desc", label: "Prix : décroissant" },
    { value: "relevance", label: "Pertinence" },
  ];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categorySlug) count++;
    if (subCategorySlug) count++;
    if (city) count++;
    if (minPrice || maxPrice) count++;
    if (sellerType && sellerType !== "all") count++;
    if (delivery) count++;
    if (onlyDeals) count++;
    if (onlinePayment) count++;
    if (conditions.length > 0) count++;
    const attributeCodes = new Set(
      Array.from(searchParams.keys())
        .filter((key) => key.startsWith("attr_"))
        .map((key) => key.replace(/^attr_/, "").replace(/_(min|max)$/, "")),
    );
    count += attributeCodes.size;
    return count;
  }, [
    categorySlug,
    subCategorySlug,
    city,
    minPrice,
    maxPrice,
    sellerType,
    delivery,
    onlyDeals,
    onlinePayment,
    conditions.length,
    searchParams,
  ]);

  const paginationPages = useMemo(() => {
    const pages = new Set([1, totalPages, page - 1, page, page + 1]);
    return Array.from(pages)
      .filter((value) => value >= 1 && value <= totalPages)
      .sort((a, b) => a - b);
  }, [page, totalPages]);

  const activeDynamicFilterChips = useMemo(() => {
    return dynamicFacets.flatMap((facet) => {
      const code = facet.attribute.code;
      const min = searchParams.get(`attr_${code}_min`);
      const max = searchParams.get(`attr_${code}_max`);
      const value = searchParams.get(`attr_${code}`);
      if (min !== null || max !== null) {
        return [
          {
            code,
            label: `${facet.attribute.label} : ${min || "min"} – ${max || "max"}${facet.attribute.unit ? ` ${facet.attribute.unit}` : ""}`,
            keys: [`attr_${code}_min`, `attr_${code}_max`],
          },
        ];
      }
      if (!value) return [];
      const option = dynamicFacetDropdownOptions[code]?.find(
        (candidate) => candidate.value === value,
      );
      return [
        {
          code,
          label: `${facet.attribute.label} : ${option?.label || humanizeFacetValue(value)}`,
          keys: [`attr_${code}`],
        },
      ];
    });
  }, [dynamicFacetDropdownOptions, dynamicFacets, searchParams]);

  /**
   * The h1 describes what the user is actually looking at: their query, the
   * category they drilled into, or the unfiltered catalogue.
   */
  const pageHeading = useMemo(() => {
    if (query) return `Recherche : ${query}`;
    if (activeSubCat) return getTaxonomyLabel(activeSubCat, "compact");
    if (activeCategory) return getTaxonomyLabel(activeCategory, "compact");
    return "Toutes les annonces";
  }, [query, activeSubCat, activeCategory]);

  /* Search metadata follows the same subject the heading does, so the tab, the
     shared link and the crawler all describe the results actually on screen.

     The canonical deliberately collapses to the category path (or to the bare
     search route): filters, sort, view mode and pagination all live in the query
     string, so every combination would otherwise present itself as a separate
     indexable page competing with the one that should rank. A free-text query is
     noindexed for the same reason — arbitrary user queries generate unbounded
     thin pages, which is the classic classifieds index-bloat trap. */
  const searchMeta = useMemo(() => {
    const place = city ? ` à ${city}` : "";
    if (query) {
      return {
        title: `Recherche : ${query}${place}`,
        description: `Annonces correspondant à « ${query} »${place} sur Shongre.`,
        canonicalPath: "/recherche",
        noIndex: true,
      };
    }
    const subject = activeSubCat?.name || activeCategory?.name;
    if (subject) {
      return {
        title: `${subject}${place} - Annonces d'occasion`,
        description:
          `Toutes les annonces ${subject.toLowerCase()}${place} sur Shongre : ` +
          "particuliers et professionnels, paiement sécurisé et livraison disponible.",
        canonicalPath: activeCategory
          ? `/categorie/${activeCategory.slug}`
          : "/recherche",
      };
    }
    return {
      title: `Toutes les annonces${place}`,
      description:
        "Parcourez toutes les annonces Shongre : véhicules, immobilier, mode, maison, " +
        `multimédia et loisirs, partout en ${activeMarket.name}.`,
      canonicalPath: "/recherche",
    };
  }, [activeCategory, activeMarket.name, activeSubCat, city, query]);

  usePageMeta(searchMeta);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page heading. The search results are the page's subject, so they need a
          real h1 — it was previously the only top-level route with none. */}
      <div className="mb-3 sm:mb-4">
        <h1 className="text-lg sm:text-2xl font-bold text-stone-900 tracking-tight">
          {pageHeading}
        </h1>
        {/* The visible result count lives in the results toolbar, next to the
            controls that change it. Printing it here too cost a line of mobile
            fold for no new information — but the live region still has to
            announce it, so it stays for assistive tech.

            It was previously revealed again from `sm` up, which put the count
            on screen twice on every tablet and desktop ("17 annonces
            correspondent à votre recherche" here, "17 annonces" in the
            toolbar). Staying `sr-only` at every width is what the surrounding
            note already described: one visible count, announced once. */}
        <p
          className="text-sm text-stone-500 mt-1 sr-only"
          aria-live="polite"
          aria-atomic="true"
        >
          {isLoading
            ? "Recherche en cours…"
            : `${plural(totalCount, "annonce")} ${
                totalCount > 1 ? "correspondent" : "correspond"
              } à votre recherche`}
        </p>
      </div>

      {/* Top Search bar on Search Page */}
      <div className="bg-bg-surface p-3 sm:p-5 rounded-card border border-border-base shadow-sm mb-4 sm:mb-6">
        <GlobalSearchBar
          variant="search-page"
          idPrefix="search-page"
          initialQuery={query}
          initialCategorySlug={categorySlug}
          initialSubCategorySlug={subCategorySlug}
          initialCity={city}
          initialRadiusKm={radiusKm}
          showCategory={true}
          showLocation={true}
          showRadius={true}
          navigateOnSubmit={false}
          onSearch={({
            query: newQ,
            categorySlug: newCat,
            subCategorySlug: newSub,
            city: newCity,
            radiusKm: newRad,
          }) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              if (newCat !== categorySlug || newSub !== subCategorySlug) {
                deleteAttributeFilters(next);
              }
              if (newQ) next.set("query", newQ);
              else next.delete("query");
              if (newCat) next.set("category", newCat);
              else next.delete("category");
              if (newSub) next.set("subCategory", newSub);
              else next.delete("subCategory");
              if (newCity) next.set("city", newCity);
              else next.delete("city");
              if (newRad && newRad > 0) next.set("radius", String(newRad));
              else next.delete("radius");
              next.delete("page");
              return next;
            });
          }}
        />

        {/* Active Filters Badges */}
        {(query || activeFilterCount > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-border-subtle mt-3">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1">
              Filtres actifs :
            </span>

            {query && (
              <FilterChip
                tone="query"
                label={query}
                onRemove={() => updateFilter("query", undefined)}
              >
                "{query}"
              </FilterChip>
            )}

            {activeCategory && (
              <FilterChip
                label={getTaxonomyLabel(activeCategory, "compact")}
                onRemove={() => updateFilter("category", undefined)}
              >
                {getTaxonomyLabel(activeCategory, "compact")}
              </FilterChip>
            )}

            {activeSubCat && (
              <FilterChip
                label={getTaxonomyLabel(activeSubCat, "compact")}
                onRemove={() => updateFilter("subCategory", undefined)}
              >
                {getTaxonomyLabel(activeSubCat, "compact")}
              </FilterChip>
            )}

            {sellerType === "pro" && (
              <FilterChip
                tone="strong"
                onRemove={() => updateFilter("sellerType", undefined)}
              >
                Professionnels
              </FilterChip>
            )}

            {sellerType === "individual" && (
              <FilterChip
                onRemove={() => updateFilter("sellerType", undefined)}
              >
                Particuliers
              </FilterChip>
            )}

            {delivery && (
              <FilterChip
                tone="success"
                onRemove={() => updateFilter("delivery", undefined)}
              >
                {t("search.searchPage.livraisonDisponible2")}
              </FilterChip>
            )}

            {onlyDeals && (
              <FilterChip
                tone="warning"
                onRemove={() => updateFilter("onlyDeals", undefined)}
              >
                Bons plans
              </FilterChip>
            )}

            {onlinePayment && (
              <FilterChip
                tone="success"
                onRemove={() => updateFilter("onlinePayment", undefined)}
              >
                Paiement en ligne
              </FilterChip>
            )}

            {conditions.length > 0 && (
              <FilterChip onRemove={() => updateFilter("condition", undefined)}>
                {conditions.length === 1
                  ? CONDITION_FILTER_OPTIONS.find(
                      (option) => option.value === conditions[0],
                    )?.label || "État"
                  : `${conditions.length} états`}
              </FilterChip>
            )}

            {(minPrice !== undefined || maxPrice !== undefined) && (
              <FilterChip
                onRemove={() => {
                  updateFilter("minPrice", undefined);
                  updateFilter("maxPrice", undefined);
                }}
              >
                {`${
                  minPrice === undefined
                    ? t("search.searchPage.minimumShort")
                    : formatPriceBound(minPrice)
                } – ${
                  maxPrice === undefined
                    ? t("search.searchPage.maximumShort")
                    : formatPriceBound(maxPrice)
                }`}
              </FilterChip>
            )}

            {activeDynamicFilterChips.map((chip) => (
              <FilterChip
                key={chip.code}
                onRemove={() => {
                  setSearchParams((previous) => {
                    const next = new URLSearchParams(previous);
                    chip.keys.forEach((key) => next.delete(key));
                    next.delete("page");
                    return next;
                  });
                }}
              >
                {chip.label}
              </FilterChip>
            ))}

            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-stone-500 hover:text-danger font-semibold underline ml-2 cursor-pointer"
            >
              {t("search.searchPage.effacerTout")}
            </button>
          </div>
        )}
      </div>

      {/* Main Content Layout: Sidebar + Grid */}
      <div
        className={
          showDesktopFilters
            ? "grid grid-cols-1 lg:grid-cols-4 gap-6"
            : "w-full space-y-4"
        }
      >
        {/* Desktop Sidebar Filters */}
        {showDesktopFilters && (
          <aside
            className="hidden lg:col-span-1 lg:block"
            aria-label="Filtres de recherche"
          >
            <FilterPanel title="Filtres" onReset={clearAllFilters}>
              {/* Categories */}
              <div>
                <label
                  htmlFor="desktop-category-select"
                  className="text-xs font-bold text-stone-900 uppercase tracking-wider block mb-2"
                >
                  {t("search.searchPage.categories2")}
                </label>
                <div className="space-y-2.5">
                  <DropdownMenu
                    id="desktop-category-select"
                    ariaLabel="Filtrer par catégorie"
                    fullWidth
                    searchable
                    searchPlaceholder="Rechercher une catégorie…"
                    headerTitle={
                      <div className="flex items-center gap-1.5 text-stone-600 normal-case font-semibold">
                        <Layers className="w-icon-sm h-icon-sm text-primary shrink-0" />
                        <span>{t("search.searchPage.categories")}</span>
                      </div>
                    }
                    options={categoryDropdownOptions}
                    value={categorySlug || ""}
                    onChange={(val) =>
                      updateFilter("category", val || undefined)
                    }
                  />

                  {/* Subcategory dropdown when category with children is active */}
                  {subcategoryDropdownOptions.length > 0 && (
                    <div className="pt-1">
                      <label
                        htmlFor="desktop-subcategory-select"
                        className="text-micro font-semibold text-stone-600 block mb-1.5"
                      >
                        {t("search.searchPage.sousCategorie")}
                      </label>
                      <DropdownMenu
                        id="desktop-subcategory-select"
                        ariaLabel="Filtrer par sous-catégorie"
                        fullWidth
                        searchable={subcategoryDropdownOptions.length > 5}
                        searchPlaceholder="Rechercher une sous-catégorie…"
                        headerTitle={
                          <div className="flex items-center gap-1.5 text-stone-600 normal-case font-semibold">
                            <Tag className="w-icon-sm h-icon-sm text-primary shrink-0" />
                            <span>{t("search.searchPage.sousCategories")}</span>
                          </div>
                        }
                        options={subcategoryDropdownOptions}
                        value={subCategorySlug || ""}
                        onChange={(val) =>
                          updateFilter("subCategory", val || undefined)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Seller Type */}
              <div className="pt-4 border-t border-border-subtle">
                <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3">
                  {t("search.searchPage.typeDeVendeur")}
                </h2>
                <div className="space-y-2">
                  {[
                    { value: "all", label: "Tous les vendeurs" },
                    { value: "individual", label: "Particuliers uniquement" },
                    { value: "pro", label: "Professionnels (Boutiques)" },
                  ].map((s) => (
                    <label
                      key={s.value}
                      className="flex items-center gap-2 min-h-6 text-xs font-medium text-stone-700 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="sellerType"
                        checked={sellerType === s.value}
                        onChange={() => updateFilter("sellerType", s.value)}
                        className="w-4 h-4 shrink-0 text-primary focus:ring-primary"
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Condition. The data layer has always supported
                  `filters.conditions`; nothing ever exposed it, so the one facet
                  printed on every card was the one you could not filter by. */}
              <div className="pt-4 border-t border-border-subtle">
                <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3">
                  {t("search.searchPage.etat")}
                </h2>
                <div className="space-y-2">
                  {CONDITION_FILTER_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="touch-row gap-2 min-h-6 text-xs font-medium text-stone-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={conditions.includes(option.value)}
                        onChange={() => toggleCondition(option.value)}
                        className="w-4 h-4 shrink-0"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range. The slider commits on release, so the separate
                  "Appliquer le prix" button that the two number fields needed
                  as a commit point is gone with them. */}
              <div className="pt-4 border-t border-border-subtle">
                <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3">
                  {t("search.searchPage.priceInCurrency", {
                    currency: currencySymbol,
                  })}
                </h2>
                <PriceRangeSlider
                  min={minPrice}
                  max={maxPrice}
                  onChange={handlePriceChange}
                  currencySymbol={currencySymbol}
                />
              </div>

              {/* Delivery & Payment Toggles */}
              <div className="pt-4 border-t border-border-subtle space-y-2.5">
                <Checkbox
                  label={t("search.searchPage.livraisonDisponible")}
                  description="Mondial Relay, Colissimo"
                  checked={delivery}
                  onChange={(e) =>
                    updateFilter(
                      "delivery",
                      e.target.checked ? "true" : undefined,
                    )
                  }
                />
                <Checkbox
                  label={t("search.searchPage.paiementSecuriseEnLigne")}
                  checked={onlinePayment}
                  onChange={(e) =>
                    updateFilter(
                      "onlinePayment",
                      e.target.checked ? "true" : undefined,
                    )
                  }
                />
                <Checkbox
                  label="Bons plans uniquement"
                  checked={onlyDeals}
                  onChange={(e) =>
                    updateFilter(
                      "onlyDeals",
                      e.target.checked ? "true" : undefined,
                    )
                  }
                />
              </div>

              {/* Dynamic Category Specific Facets */}
              {dynamicFacets.length > 0 && (
                <div className="pt-4 border-t border-border-subtle space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      {t("search.searchPage.filtresSpecifiques")}
                    </h2>
                    <span className="text-micro bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">
                      {dynamicFacets.length}
                    </span>
                  </div>

                  {dynamicFacets.map((facet) => {
                    const attr = facet.attribute;
                    const currentValue =
                      searchParams.get(`attr_${attr.code}`) || "";
                    const facetOptions =
                      dynamicFacetDropdownOptions[attr.code] || [];

                    if (
                      (facet.facetType === "select" ||
                        facet.facetType === "multi_select") &&
                      facetOptions.length > 1
                    ) {
                      return (
                        <div key={attr.id} className="space-y-1">
                          <label className="text-xs font-semibold text-stone-700 block">
                            {attr.label}
                          </label>
                          <DropdownMenu
                            id={`attr-${attr.code}-select`}
                            ariaLabel={`Filtrer par ${attr.label}`}
                            fullWidth
                            size="sm"
                            headerTitle={attr.label}
                            options={facetOptions}
                            value={currentValue}
                            onChange={(val) =>
                              updateFilter(
                                `attr_${attr.code}`,
                                val || undefined,
                              )
                            }
                          />
                        </div>
                      );
                    }

                    if (facet.facetType === "range") {
                      return (
                        <div key={attr.id} className="space-y-1">
                          <label className="text-xs font-semibold text-stone-700 block">
                            {attr.label} {attr.unit ? `(${attr.unit})` : ""}
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Input
                              type="number"
                              placeholder="Min"
                              aria-label="Prix minimum en euros"
                              value={
                                searchParams.get(`attr_${attr.code}_min`) || ""
                              }
                              onChange={(e) =>
                                updateFilter(
                                  `attr_${attr.code}_min`,
                                  e.target.value || undefined,
                                )
                              }
                              className="h-control-sm text-xs"
                            />
                            <Input
                              type="number"
                              placeholder="Max"
                              aria-label="Prix maximum en euros"
                              value={
                                searchParams.get(`attr_${attr.code}_max`) || ""
                              }
                              onChange={(e) =>
                                updateFilter(
                                  `attr_${attr.code}_max`,
                                  e.target.value || undefined,
                                )
                              }
                              className="h-control-sm text-xs"
                            />
                          </div>
                        </div>
                      );
                    }

                    if (facet.facetType === "boolean") {
                      return (
                        <Checkbox
                          key={attr.id}
                          label={attr.label}
                          checked={currentValue === "true"}
                          onChange={(event) =>
                            updateFilter(
                              `attr_${attr.code}`,
                              event.target.checked ? "true" : undefined,
                            )
                          }
                        />
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </FilterPanel>
          </aside>
        )}

        {/* Results Column */}
        <div
          className={
            showDesktopFilters ? "lg:col-span-3 space-y-4" : "w-full space-y-4"
          }
        >
          {/* Controls Bar: Total Count, Save Search, View Mode, Sort */}
          <div
            id="search-results-toolbar"
            className="scroll-mt-24 bg-bg-surface p-4 rounded-card border border-border-base shadow-xs flex items-center justify-between gap-x-3 gap-y-2 flex-wrap lg:flex-nowrap mb-4"
          >
            <div className="flex items-center gap-3 min-w-0 shrink">
              {/* The result count is the only feedback a filter change gives on
                  this page — the grid below simply rewrites itself. Announced so
                  a screen-reader user hears "42 annonces" after applying a
                  filter instead of silence. */}
              <span
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="text-sm font-bold text-stone-900 shrink-0"
              >
                {plural(totalCount, "annonce")}
              </span>

              {/* Desktop Toggle Filter Panel Button */}
              <button
                type="button"
                onClick={() => setShowDesktopFilters(!showDesktopFilters)}
                className={`hidden lg:inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-xs font-bold uppercase tracking-wider ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer ${
                  showDesktopFilters
                    ? "bg-bg-base border-border-base text-stone-700 hover:bg-bg-subtle"
                    : "text-stone-900 hover:text-primary"
                }`}
                title={
                  showDesktopFilters
                    ? "Masquer les filtres"
                    : "Afficher les filtres"
                }
                aria-label={
                  showDesktopFilters
                    ? "Masquer les filtres"
                    : "Afficher les filtres"
                }
              >
                {showDesktopFilters ? (
                  <>
                    <PanelLeftClose className="w-icon-sm h-icon-sm text-stone-500" />
                    <span>Masquer</span>
                  </>
                ) : (
                  <>
                    <SlidersHorizontal className="w-icon-sm h-icon-sm text-primary" />
                    <span>Filtres</span>
                  </>
                )}
              </button>
            </div>

            {/* Below `lg` this group wraps onto its own line, and it used to be
                sized to its contents there — so the three controls huddled
                against the left edge with 60px of empty bar beside them at
                430px and 215px at 768px. It now claims the whole line, with
                "Filtres" pinned left, the view toggle pinned right, and the
                sort control absorbing whatever is left between them. */}
            <div className="flex items-center gap-2 min-w-0 w-full lg:w-auto justify-between lg:justify-end">
              {/* Mobile Filter Button with active count indicator */}
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(true)}
                className={`lg:hidden flex items-center gap-1.5 h-control-sm px-2.5 sm:px-3 rounded-control text-xs font-bold ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer shrink-0 ${
                  activeFilterCount > 0
                    ? "bg-primary text-white shadow-xs"
                    : "bg-bg-base text-stone-800 border border-border-base hover:bg-bg-subtle"
                }`}
                aria-label={`Ouvrir les filtres de recherche (${activeFilterCount} actifs)`}
              >
                <SlidersHorizontal
                  className={`w-icon-sm h-icon-sm ${activeFilterCount > 0 ? "text-white" : "text-primary"}`}
                />
                <span className="hidden sm:inline">Filtres</span>
                {activeFilterCount > 0 && (
                  <span className="min-w-4 h-4 px-1 rounded-full bg-white text-primary text-micro font-black flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Keep the save action with the other results controls so it
                  remains a single, scannable toolbar at tablet widths instead
                  of becoming a separate row beside the result count. */}
              <Button
                type="button"
                onClick={handleSaveSearch}
                variant="secondary"
                size="sm"
                className="shrink-0"
                leftIcon={
                  <Bookmark className="w-icon-sm h-icon-sm text-stone-500" />
                }
                title={t("search.searchPage.sauvegarderCetteRecherche")}
                aria-label={t("search.searchPage.sauvegarderCetteRecherche")}
              >
                <span className="hidden sm:inline">Sauvegarder</span>
              </Button>

              {/* View Mode Toggle */}
              {/* `sm` is the toolbar size: 32px, the same control height as the
                  filter button and the sort control either side of it. */}
              <ViewModeToggle
                viewMode={viewMode}
                onChange={(mode) => setViewMode(mode)}
                showMap={true}
                size="sm"
              />

              {/* Sort selector at extreme right */}
              <div className="flex items-center gap-1.5 text-xs min-w-0 shrink-0">
                <span className="text-stone-500 hidden sm:inline shrink-0 font-medium">
                  {t("search.searchPage.trierPar")}
                </span>
                <DropdownMenu
                  id="sort-select"
                  ariaLabel="Trier les résultats"
                  size="sm"
                  placement="bottom-right"
                  panelWidth="w-48"
                  className="shrink-0"
                  triggerClassName="w-auto"
                  mobileIcon={
                    <ArrowUpDown className="w-icon-sm h-icon-sm text-stone-700" />
                  }
                  headerTitle={
                    <div className="flex items-center gap-1.5 text-stone-600 normal-case font-semibold">
                      <ArrowUpDown className="w-icon-sm h-icon-sm text-primary shrink-0" />
                      <span>{t("search.searchPage.trierPar2")}</span>
                    </div>
                  }
                  options={sortDropdownOptions}
                  value={sortBy}
                  onChange={(val) => updateFilter("sortBy", val)}
                />
              </div>
            </div>
          </div>

          {/* The card titles are `h3`, so without this the outline jumped
              straight from the page `h1` to `h3`. The count is already shown
              in the toolbar, so the heading is visually hidden rather than
              repeated on screen. */}
          <h2 className="sr-only">{t("search.resultsHeading")}</h2>

          {/* Results Display (Grid / List / Map) */}
          {isLoading ? (
            <ListingGrid fluid>
              {[...Array(12)].map((_, i) => (
                <ListingCardSkeleton
                  key={i}
                  className="rounded-card border border-stone-200 bg-white p-2"
                />
              ))}
            </ListingGrid>
          ) : searchError ? (
            <StatePanel
              variant="error"
              title={t("common.error")}
              description={t("search.searchPage.loadError")}
              action={
                <Button
                  onClick={() => setSearchAttempt((attempt) => attempt + 1)}
                >
                  {t("common.retry")}
                </Button>
              }
            />
          ) : listings.length > 0 ? (
            viewMode === "map" ? (
              <React.Suspense
                fallback={
                  <div
                    role="status"
                    aria-label={t("common.loading")}
                    className="h-search-map overflow-hidden rounded-2xl border border-border-base bg-bg-surface p-3 lg:h-search-map-tall"
                  >
                    <Skeleton className="h-full w-full rounded-xl" />
                  </div>
                }
              >
                <ExploreMapView
                  listings={listings}
                  selectedCity={city || undefined}
                  onSelectCity={(selected) => updateFilter("city", selected)}
                />
              </React.Suspense>
            ) : viewMode === "grid" ? (
              <ListingGrid fluid>
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    variant="grid"
                  />
                ))}
              </ListingGrid>
            ) : (
              <div className="flex flex-col gap-3">
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    variant="list"
                  />
                ))}
              </div>
            )
          ) : (
            <NoResultsFound
              id="search-no-results"
              query={query}
              onClearFilters={clearAllFilters}
              clearFiltersLabel={t("search.searchPage.effacerTousLesFiltres")}
              onSaveSearch={handleSaveSearch}
              saveSearchLabel={t("search.searchPage.sauvegarderCetteRecherche")}
            />
          )}

          {!isLoading &&
            !searchError &&
            listings.length > 0 &&
            totalPages > 1 && (
              <nav
                aria-label="Pagination des résultats"
                className="flex items-center justify-center gap-1.5 pt-3"
              >
                <button
                  type="button"
                  onClick={() => updatePage(page - 1)}
                  disabled={page <= 1}
                  className={`inline-flex h-control-sm items-center gap-1 rounded-control border border-border-base bg-white px-2.5 text-xs font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-40 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS}`}
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-icon-sm w-icon-sm" />
                  <span className="hidden sm:inline">Précédente</span>
                </button>

                {paginationPages.map((pageNumber, index) => (
                  <React.Fragment key={pageNumber}>
                    {index > 0 &&
                      pageNumber - paginationPages[index - 1] > 1 && (
                        <span
                          className="px-1 text-xs text-stone-400"
                          aria-hidden
                        >
                          …
                        </span>
                      )}
                    <button
                      type="button"
                      onClick={() => updatePage(pageNumber)}
                      aria-current={pageNumber === page ? "page" : undefined}
                      aria-label={`Page ${pageNumber}`}
                      className={`h-control-sm min-w-8 rounded-control px-2 text-xs font-bold ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} ${
                        pageNumber === page
                          ? "bg-primary text-white"
                          : "border border-border-base bg-white text-stone-700 hover:bg-bg-subtle"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  </React.Fragment>
                ))}

                <button
                  type="button"
                  onClick={() => updatePage(page + 1)}
                  disabled={page >= totalPages}
                  className={`inline-flex h-control-sm items-center gap-1 rounded-control border border-border-base bg-white px-2.5 text-xs font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-40 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS}`}
                  aria-label="Page suivante"
                >
                  <span className="hidden sm:inline">Suivante</span>
                  <ChevronRight className="h-icon-sm w-icon-sm" />
                </button>
              </nav>
            )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <Drawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title={t("search.searchPage.filtresDeRecherche")}
      >
        <FilterPanel
          presentation="drawer"
          onReset={clearAllFilters}
          footer={
            <Button
              variant="primary"
              fullWidth
              onClick={() => setIsFilterDrawerOpen(false)}
            >
              Voir les résultats ({totalCount})
            </Button>
          }
          contentClassName="space-y-6"
        >
          {/* Category */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              {t("search.searchPage.categorie")}
            </label>
            <DropdownMenu
              id="mobile-category-select"
              ariaLabel="Filtrer par catégorie"
              fullWidth
              searchable
              searchPlaceholder="Rechercher une catégorie…"
              headerTitle={
                <div className="flex items-center gap-1.5 text-stone-600 normal-case font-semibold">
                  <Layers className="w-icon-sm h-icon-sm text-primary shrink-0" />
                  <span>{t("search.searchPage.categories")}</span>
                </div>
              }
              options={categoryDropdownOptions}
              value={categorySlug || ""}
              onChange={(val) => updateFilter("category", val || undefined)}
            />

            {/* Subcategory dropdown if active category has children */}
            {subcategoryDropdownOptions.length > 0 && (
              <div className="pt-3">
                <label className="text-micro font-semibold text-stone-600 block mb-1.5">
                  {t("search.searchPage.sousCategorie")}
                </label>
                <DropdownMenu
                  id="mobile-subcategory-select"
                  ariaLabel="Filtrer par sous-catégorie"
                  fullWidth
                  searchable={subcategoryDropdownOptions.length > 5}
                  searchPlaceholder="Rechercher une sous-catégorie…"
                  headerTitle={
                    <div className="flex items-center gap-1.5 text-stone-600 normal-case font-semibold">
                      <Tag className="w-icon-sm h-icon-sm text-primary shrink-0" />
                      <span>{t("search.searchPage.sousCategories")}</span>
                    </div>
                  }
                  options={subcategoryDropdownOptions}
                  value={subCategorySlug || ""}
                  onChange={(val) =>
                    updateFilter("subCategory", val || undefined)
                  }
                />
              </div>
            )}
          </div>

          {/* Seller type */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              {t("search.searchPage.typeDeVendeur")}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { value: "all", label: "Tous" },
                { value: "individual", label: "Particuliers" },
                { value: "pro", label: "Pros" },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => updateFilter("sellerType", s.value)}
                  className={`h-control-md px-2 text-xs font-bold rounded-control border text-center ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer ${
                    sellerType === s.value
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-white text-stone-700 border-border-base hover:bg-stone-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              {t("search.searchPage.etat")}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {CONDITION_FILTER_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="touch-row gap-2 rounded-control border border-border-subtle px-2 py-1.5 text-xs font-medium text-stone-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={conditions.includes(option.value)}
                    onChange={() => toggleCondition(option.value)}
                    className="h-4 w-4 shrink-0"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price */}
          <div>
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              {t("search.searchPage.budgetInCurrency", {
                currency: currencySymbol,
              })}
            </span>
            <PriceRangeSlider
              min={minPrice}
              max={maxPrice}
              onChange={handlePriceChange}
              currencySymbol={currencySymbol}
            />
          </div>

          {/* Delivery & Security Checkboxes */}
          <div className="pt-2 border-t border-border-subtle space-y-2.5">
            <Checkbox
              label={t("search.searchPage.livraisonDisponible")}
              description="Mondial Relay, Colissimo, transporteur"
              checked={delivery}
              onChange={(e) =>
                updateFilter("delivery", e.target.checked ? "true" : undefined)
              }
            />
            <Checkbox
              label={t("search.searchPage.paiementSecuriseEnLigne")}
              checked={onlinePayment}
              onChange={(e) =>
                updateFilter(
                  "onlinePayment",
                  e.target.checked ? "true" : undefined,
                )
              }
            />
            <Checkbox
              label="Bons plans uniquement"
              checked={onlyDeals}
              onChange={(e) =>
                updateFilter("onlyDeals", e.target.checked ? "true" : undefined)
              }
            />
          </div>

          {/* Dynamic Facets in Drawer */}
          {dynamicFacets.length > 0 && (
            <div className="pt-2 border-t border-border-subtle space-y-3">
              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider block">
                {t("search.searchPage.criteresSpecifiques")}
              </span>
              {dynamicFacets.map((facet) => {
                const attr = facet.attribute;
                const currentValue =
                  searchParams.get(`attr_${attr.code}`) || "";
                const facetOptions =
                  dynamicFacetDropdownOptions[attr.code] || [];

                if (
                  (facet.facetType === "select" ||
                    facet.facetType === "multi_select") &&
                  facetOptions.length > 1
                ) {
                  return (
                    <div key={attr.id} className="space-y-1">
                      <label className="text-xs font-semibold text-stone-700 block">
                        {attr.label}
                      </label>
                      <DropdownMenu
                        id={`mobile-attr-${attr.code}-select`}
                        ariaLabel={`Filtrer par ${attr.label}`}
                        fullWidth
                        size="md"
                        headerTitle={attr.label}
                        options={facetOptions}
                        value={currentValue}
                        onChange={(val) =>
                          updateFilter(`attr_${attr.code}`, val || undefined)
                        }
                      />
                    </div>
                  );
                }

                if (facet.facetType === "range") {
                  return (
                    <div key={attr.id} className="space-y-1">
                      <label className="text-xs font-semibold text-stone-700 block">
                        {attr.label} {attr.unit ? `(${attr.unit})` : ""}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          aria-label="Prix minimum en euros"
                          value={
                            searchParams.get(`attr_${attr.code}_min`) || ""
                          }
                          onChange={(e) =>
                            updateFilter(
                              `attr_${attr.code}_min`,
                              e.target.value || undefined,
                            )
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          aria-label="Prix maximum en euros"
                          value={
                            searchParams.get(`attr_${attr.code}_max`) || ""
                          }
                          onChange={(e) =>
                            updateFilter(
                              `attr_${attr.code}_max`,
                              e.target.value || undefined,
                            )
                          }
                        />
                      </div>
                    </div>
                  );
                }

                if (facet.facetType === "boolean") {
                  return (
                    <Checkbox
                      key={attr.id}
                      label={attr.label}
                      checked={currentValue === "true"}
                      onChange={(event) =>
                        updateFilter(
                          `attr_${attr.code}`,
                          event.target.checked ? "true" : undefined,
                        )
                      }
                    />
                  );
                }

                return null;
              })}
            </div>
          )}
        </FilterPanel>
      </Drawer>
    </div>
  );
};
