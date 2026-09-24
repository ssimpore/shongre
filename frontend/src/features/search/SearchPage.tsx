import type { TaxonomyV1TreeResponse } from "@shongre/contracts/taxonomy";
import {
  resolveLocalizedTaxonomySeoText,
  resolveTaxonomySeoRecord,
} from "../../domains/taxonomy/taxonomy.seo";
import { PAGE_SIZES } from "../../configuration/pagination.config";
import { routes } from "../../configuration/routes";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  useLocation,
  useNavigate,
  useSearchParams,
  useParams,
} from "react-router-dom";
import {
  Bookmark,
  ArrowUpDown,
  Tag,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  MarketScopedSearchFilters,
  SearchFacetValue,
  SearchResponse,
} from "../../api/contracts/search.contract";
import { services } from "../../api/client/service-registry";
import { SearchFilters, ListingCondition } from "../../types";
import { getTaxonomyLabel } from "../../domains/taxonomy/taxonomy.labels";
import { usePageMeta } from "../../hooks/usePageMeta";
import { Container } from "../../design-system/primitives/Layout";
import { useRootTaxonomyCategories } from "../../hooks/useRootTaxonomyCategories";
import { ListingCard } from "../../design-system/primitives/ListingCard";
import { Button } from "../../design-system/primitives/Button";
import { IconButton } from "../../design-system/primitives/IconButton";
import { Input, Checkbox } from "../../design-system/primitives/FormField";
import { plural } from "../../utilities/formatters";
import {
  ListingCardSkeleton,
  FilterPanel,
  ListingGrid,
  LocationSelector,
  SearchActiveFiltersBar,
  SearchMapResultsLayout,
  SearchResultsToolbar,
  SearchFilterDrawer,
  SearchSortControl,
  Skeleton,
  StatePanel,
  useSearchFilterDisclosure,
} from "../../design-system";
import type { LocationSelectorValue } from "../../design-system";
import { NoResultsFound } from "../../design-system/primitives/NoResultsFound";
import { GlobalSearchBar } from "../../design-system/primitives/GlobalSearchBar";
import {
  mergeKeywordSearchParams,
  type KeywordSearchCriteria,
} from "../../configuration/search-url";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { browserPreferencesService } from "../../services/browser-preferences.service";
import { useRecentSearches } from "../../hooks/useRecentSearches";
import { analyticsService } from "../../services/analytics.service";
import { CategoryIcon } from "../../design-system/primitives/CategoryIcon";
import { FilterChip } from "../../design-system/primitives/FilterChip";
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
import { usePublicRouteData } from "../../app/providers/PublicRouteDataProvider";
import { useAuth } from "../../app/providers/AuthProvider";
import { majorToMinorAmount } from "@shongre/shared/money";
import {
  pageMetaForPolicy,
  resolveSeoPolicy,
  structuredDataForPolicy,
} from "../../platform/seo/seo-policy";
import {
  canonicalSearchKey,
  normalizeSearchFilters,
} from "../../api/search/normalized-search";

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
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    location: userLocation,
    resetLocation,
    activeMarket,
    currentLocale,
    currencySymbol,
    marketContext,
  } = useMarketLocation();
  const toast = useToast();
  const { currentUser } = useAuth();
  const publicRouteData = usePublicRouteData();
  const { categories: taxonomyCategories } = useRootTaxonomyCategories(
    `${activeMarket.code}:${currentLocale}`,
  );
  const initialData =
    publicRouteData?.kind === "listing_search" ? publicRouteData : null;
  const [taxonomySnapshot, setTaxonomySnapshot] = useState<
    TaxonomyV1TreeResponse | undefined
  >(initialData?.taxonomy);

  const formatPriceBound = (value: number) =>
    `${value.toLocaleString(currentLocale)} ${currencySymbol}`;

  const urlViewParam = searchParams.get("view") as
    "grid" | "list" | "map" | null;
  const viewMode =
    urlViewParam === "map" || urlViewParam === "list" ? urlViewParam : "grid";
  const {
    filtersExpanded: isFilterDrawerOpen,
    activeFilterSection,
    openFilters,
    closeFilters,
  } = useSearchFilterDisclosure();
  const lastStartedSearchKey = useRef<string | null>(null);
  const cursorByPage = useRef(new Map<number, string | undefined>());
  const paginationScope = useRef("");
  const queryClient = useQueryClient();

  /* `/categorie/:categorySlug` is the canonical, linkable category search.
     Keep that route parameter implicit instead of copying it into `?category=`:
     the duplicate query made a canonical landing look like an interacted facet
     and could race a listing click with a replace-navigation in WebKit. Category
     changes and clears leave the pretty route explicitly below. */
  const { categorySlug: categoryRouteSlug } = useParams<{
    categorySlug?: string;
  }>();

  /**
   * The taxonomy this page needs is one node, not the catalogue.
   *
   * `resolveSeoPolicy` reads the snapshot on `/categorie/:slug` alone, and only
   * to look that slug up. This used to refetch the entire published tree —
   * 735 KiB of categories, listing types and SEO projections — on mount and on
   * every pathname change, while throwing away the node the server had already
   * put in the document. `/recherche` needs no request at all, and a category
   * route asks for its own node.
   */
  useEffect(() => {
    if (!categoryRouteSlug) {
      setTaxonomySnapshot(undefined);
      return;
    }
    const serverSnapshot = initialData?.taxonomy;
    if (
      serverSnapshot &&
      resolveTaxonomySeoRecord(categoryRouteSlug, serverSnapshot)
    ) {
      setTaxonomySnapshot(serverSnapshot);
      return;
    }
    let active = true;
    setTaxonomySnapshot(undefined);
    void services.taxonomy
      .getV1Tree({
        marketContext: { countryCode: activeMarket.code },
        locale: currentLocale,
        category: categoryRouteSlug,
      })
      .then((tree) => {
        if (active) setTaxonomySnapshot(tree);
      })
      .catch(() => {
        if (active) setTaxonomySnapshot(undefined);
      });
    return () => {
      active = false;
    };
  }, [
    activeMarket.code,
    categoryRouteSlug,
    currentLocale,
    initialData?.taxonomy,
  ]);

  // Extract filter params from URL
  const query = searchParams.get("query") || searchParams.get("q") || "";
  const categorySlug = searchParams.get("category") || categoryRouteSlug || "";
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
    activeMarket.code ||
    browserPreferencesService.getActiveMarketCode();
  const pageParam = Number(searchParams.get("page") || "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const cursor = searchParams.get("cursor") || undefined;

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

  const filters = useMemo<MarketScopedSearchFilters>(
    () =>
      normalizeSearchFilters({
        query: query || undefined,
        categorySlug: categorySlug || undefined,
        subCategorySlug: subCategorySlug || undefined,
        city: city || undefined,
        radiusKm,
        minPrice,
        maxPrice,
        sellerType: sellerType as MarketScopedSearchFilters["sellerType"],
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
        cursor,
      }),
    [
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
      dynamicAttributeFilters,
      sortBy,
      marketCode,
      page,
      cursor,
    ],
  );
  const searchKey = useMemo(() => canonicalSearchKey(filters), [filters]);
  const matchesServerInitialSearch =
    initialData?.pathname === location.pathname && location.search === "";
  const paginationScopeKey = useMemo(
    () => canonicalSearchKey({ ...filters, page: 1, cursor: undefined })[1],
    [filters],
  );
  if (paginationScope.current !== paginationScopeKey) {
    paginationScope.current = paginationScopeKey;
    cursorByPage.current.clear();
    cursorByPage.current.set(page, cursor);
  }
  const serverInitialData: SearchResponse | undefined =
    initialData && matchesServerInitialSearch
      ? {
          items: initialData.items,
          total: initialData.total,
          page: initialData.page,
          totalPages: initialData.totalPages,
          totalRelation: initialData.totalRelation,
          snapshotAt: initialData.snapshotAt,
          pageInfo: initialData.pageInfo,
        }
      : undefined;
  const searchQuery = useQuery<SearchResponse>({
    queryKey: searchKey,
    queryFn: ({ signal }) => services.search.search(filters, { signal }),
    initialData: serverInitialData,
    initialDataUpdatedAt: matchesServerInitialSearch ? Date.now() : undefined,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    retry: 1,
  });
  const listings = searchQuery.data?.items ?? [];
  const totalCount = searchQuery.data?.total ?? 0;
  const totalPages = searchQuery.data?.totalPages ?? 1;
  const totalRelation = searchQuery.data?.totalRelation ?? "exact";
  const attributeFacetValues: Record<string, SearchFacetValue[]> =
    searchQuery.data?.facets?.attributes ?? {};
  const isLoading = searchQuery.isPending;
  const searchError = searchQuery.isError && !searchQuery.data;
  const hasNextPage = Boolean(searchQuery.data?.pageInfo?.hasNextPage);

  const { rememberSearch } = useRecentSearches();

  // Search lifecycle telemetry follows the canonical query key, not component
  // renders. React Query owns deduplication, cancellation and stale protection.
  useEffect(() => {
    const startedSearchKey = searchKey[1];
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
    if (query) {
      rememberSearch(query);
    }
  }, [
    searchKey,
    query,
    categorySlug,
    minPrice,
    maxPrice,
    sellerType,
    delivery,
    sortBy,
    radiusKm,
    rememberSearch,
  ]);

  useEffect(() => {
    const response = searchQuery.data;
    if (!response || searchQuery.isPlaceholderData) return;
    analyticsService.track("search_performed", {
      query: query || undefined,
      categoryId: categorySlug || undefined,
      resultCount: response.total,
      zeroResults: response.total === 0,
      sort: sortBy,
      radiusKm,
    });
    cursorByPage.current.set(page, cursor);
    if (response.pageInfo?.nextCursor) {
      cursorByPage.current.set(page + 1, response.pageInfo.nextCursor);
    }
    if (
      response.totalRelation !== "lower_bound" &&
      page > response.totalPages
    ) {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.delete("cursor");
          if (response.totalPages <= 1) next.delete("page");
          else next.set("page", String(response.totalPages));
          return next;
        },
        { replace: true },
      );
    }
  }, [
    categorySlug,
    cursor,
    page,
    query,
    radiusKm,
    searchQuery.data,
    searchQuery.dataUpdatedAt,
    searchQuery.isPlaceholderData,
    setSearchParams,
    sortBy,
  ]);

  useEffect(() => {
    const nextCursor = searchQuery.data?.pageInfo?.nextCursor;
    if (!nextCursor || searchQuery.isPlaceholderData) return;
    const nextFilters = normalizeSearchFilters({
      ...filters,
      page: page + 1,
      cursor: nextCursor,
    });
    const timeout = window.setTimeout(() => {
      void queryClient.prefetchQuery({
        queryKey: canonicalSearchKey(nextFilters),
        queryFn: ({ signal }) =>
          services.search.search(nextFilters, { signal }),
        staleTime: 15_000,
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [
    filters,
    page,
    queryClient,
    searchQuery.data?.pageInfo?.nextCursor,
    searchQuery.isPlaceholderData,
  ]);

  const toggleCondition = (value: ListingCondition) => {
    const next = conditions.includes(value)
      ? conditions.filter((c) => c !== value)
      : [...conditions, value];
    updateFilter("condition", next.length > 0 ? next.join(",") : undefined);
  };

  const leaveCategoryRoute = (next: URLSearchParams) => {
    const queryString = next.toString();
    navigate({
      pathname: "/recherche",
      search: queryString ? `?${queryString}` : "",
    });
  };

  const updateFilter = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams);
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
    next.delete("cursor");

    if (key === "category" && categoryRouteSlug) {
      if (!value || value === "all" || value !== categoryRouteSlug) {
        leaveCategoryRoute(next);
        return;
      }
      next.delete("category");
    }
    setSearchParams(next);
  };

  const applyKeywordSearch = (criteria: KeywordSearchCriteria) => {
    const merged = mergeKeywordSearchParams(searchParams, criteria, {
      currentCategorySlug: categorySlug,
      categoryRouteSlug,
    });
    if (merged.leaveCategoryRoute) {
      leaveCategoryRoute(merged.params);
      return;
    }
    setSearchParams(merged.params);
  };

  const updateLocationFilter = (value: LocationSelectorValue) => {
    const next = new URLSearchParams(searchParams);
    if (value.city) next.set("city", value.city);
    else next.delete("city");
    if (value.radiusKm) next.set("radius", String(value.radiusKm));
    else next.delete("radius");
    next.delete("page");
    next.delete("cursor");
    setSearchParams(next);
  };

  const updatePage = (nextPage: number) => {
    const boundedPage = Math.min(totalPages, Math.max(1, nextPage));
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (boundedPage <= 1) next.delete("page");
      else next.set("page", String(boundedPage));
      const targetCursor = cursorByPage.current.get(boundedPage);
      if (targetCursor) next.set("cursor", targetCursor);
      else next.delete("cursor");
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
      next.delete("cursor");
      return next;
    });
  };

  const clearAllFilters = () => {
    if (categoryRouteSlug) navigate("/recherche");
    else setSearchParams(new URLSearchParams());
    resetLocation();
  };

  const handleSaveSearch = async () => {
    if (!currentUser) {
      navigate(
        routes.auth.login(
          `${location.pathname}${location.search}${location.hash}`,
        ),
      );
      return;
    }
    const categoryId = activeSubCat?.id ?? activeCategory?.id;
    if (
      !query &&
      !categoryId &&
      !city &&
      minPrice === undefined &&
      maxPrice === undefined
    ) {
      toast.info(t("watch.save.criteriaRequired"));
      return;
    }
    const title = query
      ? t("watch.save.queryTitle", { query })
      : categorySlug
        ? t("watch.save.categoryTitle", { category: categorySlug })
        : t("watch.save.customTitle");
    const id = `ss-${Date.now()}`;
    try {
      await services.watchSubscriptions.createOrReplace({
        marketCode: activeMarket.code,
        targetType: "saved_search",
        targetId: id,
        title,
        frequency: "immediate",
        channels: { inApp: true, email: false, push: true },
        searchFilter: {
          ...(query ? { query } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(city ? { city } : {}),
          ...(minPrice !== undefined
            ? {
                minPriceMinor: majorToMinorAmount(
                  minPrice,
                  activeMarket.currency,
                ),
              }
            : {}),
          ...(maxPrice !== undefined
            ? {
                maxPriceMinor: majorToMinorAmount(
                  maxPrice,
                  activeMarket.currency,
                ),
              }
            : {}),
        },
      });
      toast.success(t("watch.save.success"), t("watch.save.title"));
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : t("watch.save.error"),
      );
    }
  };

  const activeCategory = taxonomyCategories.find(
    (c) => c.slug === categorySlug || c.id === categorySlug,
  );
  const activeSubCat = activeCategory?.subCategories?.find(
    (s) => s.slug === subCategorySlug || s.id === subCategorySlug,
  );
  const activeNodeId = activeSubCat?.id || activeCategory?.id;

  const [dynamicFacets, setDynamicFacets] = useState<
    Awaited<ReturnType<typeof services.taxonomy.resolveSearchFilters>>
  >([]);

  useEffect(() => {
    let active = true;
    if (!activeNodeId) {
      setDynamicFacets([]);
      return () => {
        active = false;
      };
    }
    void services.taxonomy
      .resolveSearchFilters(activeNodeId)
      .then((facets) => {
        if (active) setDynamicFacets(facets);
      })
      .catch(() => {
        if (active) setDynamicFacets([]);
      });
    return () => {
      active = false;
    };
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
        icon: <Layers className="w-icon-sm h-icon-sm text-text-tertiary" />,
      },
      ...taxonomyCategories.map((cat) => ({
        value: cat.slug,
        label: getTaxonomyLabel(cat, "compact"),
        icon: <CategoryIcon category={cat} size="xs" />,
        sublabel: `${cat.subCategories.length} sous-catégories`,
      })),
    ],
    [taxonomyCategories],
  );

  const subcategoryDropdownOptions: DropdownOption[] = useMemo(() => {
    const children = activeCategory?.subCategories ?? [];
    if (children.length === 0) return [];
    return [
      { value: "", label: "Toutes les sous-catégories" },
      ...children.map((sub) => ({
        value: sub.slug,
        label: getTaxonomyLabel(sub, "compact"),
      })),
    ];
  }, [activeCategory?.subCategories]);

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
    if (totalRelation === "lower_bound") return [page];
    const pages = new Set([1, totalPages, page - 1, page, page + 1]);
    return Array.from(pages)
      .filter((value) => value >= 1 && value <= totalPages)
      .sort((a, b) => a - b);
  }, [page, totalPages, totalRelation]);

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
   * The category name a category route can show before hydration.
   *
   * `taxonomyCategories` is client-fetched, so on the first render — the one a
   * crawler reads and a visitor sees — `activeCategory` is undefined and
   * `/categorie/vehicules` rendered "Toutes les annonces" as its h1. The server
   * payload already carries this route's own taxonomy node, and it carries the
   * same localized `h1` the metadata is built from, so the visible heading and
   * the title agree instead of drifting for a frame.
   */
  const serverCategoryHeading = useMemo(() => {
    if (!categoryRouteSlug || !initialData?.taxonomy) return null;
    const record = resolveTaxonomySeoRecord(
      categoryRouteSlug,
      initialData.taxonomy,
    );
    if (!record) return null;
    return (
      resolveLocalizedTaxonomySeoText(record.projection.h1, currentLocale) ||
      resolveLocalizedTaxonomySeoText(record.node.labels, currentLocale) ||
      null
    );
  }, [categoryRouteSlug, currentLocale, initialData?.taxonomy]);

  /**
   * The h1 describes what the user is actually looking at: their query, the
   * category they drilled into, or the unfiltered catalogue.
   */
  const pageHeading = useMemo(() => {
    if (query) return t("search.searchPage.queryHeading", { query });
    const selectedCategory = activeSubCat ?? activeCategory;
    if (selectedCategory) {
      return getTaxonomyLabel(selectedCategory, {
        locale: currentLocale,
      });
    }
    // Until the client taxonomy resolves, a category route still knows its own
    // name from the server payload.
    if (serverCategoryHeading) return serverCategoryHeading;
    return t("search.searchPage.allListings");
  }, [
    activeCategory,
    activeSubCat,
    currentLocale,
    query,
    serverCategoryHeading,
    t,
  ]);

  const resultsDescription = query
    ? t("search.searchPage.refineResultsDescription")
    : activeSubCat || activeCategory || serverCategoryHeading
      ? t("search.searchPage.categoryResultsDescription", {
          category: pageHeading,
        })
      : t("search.searchPage.allResultsDescription");

  const searchMeta = useMemo(() => {
    if (!marketContext) {
      return { title: "Toutes les annonces", noIndex: true, follow: true };
    }
    const routeData = {
      status: "found" as const,
      data: {
        kind: "listing_search" as const,
        taxonomy: taxonomySnapshot,
        pathname: categoryRouteSlug
          ? `/categorie/${categoryRouteSlug}`
          : "/recherche",
        items: listings,
        total: totalCount,
        page,
        totalPages,
        availableCountryCodes:
          initialData?.availableCountryCodes ||
          (totalCount > 0 ? [activeMarket.code] : []),
      },
    };
    const policy = resolveSeoPolicy({
      pathname: routeData.data.pathname,
      query: Object.fromEntries(searchParams.entries()),
      marketContext,
      routeData,
    });
    return pageMetaForPolicy(
      policy,
      structuredDataForPolicy(policy, marketContext, routeData),
    );
  }, [
    activeMarket.code,
    categoryRouteSlug,
    initialData?.availableCountryCodes,
    taxonomySnapshot,
    listings,
    marketContext,
    page,
    searchParams,
    totalCount,
    totalPages,
  ]);

  usePageMeta(searchMeta);

  return (
    <Container width="listingResults" className="py-4 sm:py-6">
      {/* Mobile keyword entry.
          The desktop header slot is `hidden md:block` and the bottom tab bar's
          "Rechercher" tab points here, so on a phone the tab promised search
          and delivered a facet list. The desktop multi-field bar stays out —
          `shared-search-filters.spec.ts` locks its controls out of all five
          search surfaces, and the filter drawer plus the header bar already
          cover that width. This is the compact drawer variant with category and
          location suppressed, because the filter drawer owns both on mobile.

          In the page rather than the header: fixed chrome already takes 182px of
          a 602px phone viewport, and this scrolls away instead of adding to
          it. */}
      <div className="mb-3 md:hidden">
        <GlobalSearchBar
          variant="minimal"
          idPrefix="search-mobile"
          initialQuery={query}
          initialCategorySlug={categorySlug}
          initialSubCategorySlug={subCategorySlug}
          initialCity={city || undefined}
          initialRadiusKm={radiusKm}
          showCategory={false}
          showLocation={false}
          navigateOnSubmit={false}
          onSearch={applyKeywordSearch}
        />
      </div>

      <SearchResultsToolbar
        id="search-results-toolbar"
        title={pageHeading}
        resultDescription={resultsDescription}
        resultLabel={
          isLoading
            ? t("common.loading")
            : totalRelation === "lower_bound"
              ? `Au moins ${plural(totalCount, "annonce")}`
              : plural(totalCount, "annonce")
        }
        filterPanelId="search-filter-panel"
        filtersExpanded={isFilterDrawerOpen}
        activeFilterSection={activeFilterSection}
        filterTriggers={[
          {
            sectionId: "search-category",
            label: t("ui.filterPanel.quick.category"),
            active: Boolean(categorySlug || subCategorySlug),
          },
          {
            sectionId: "search-location",
            label: t("ui.filterPanel.quick.location"),
            active: Boolean(city),
          },
          {
            sectionId: "search-seller",
            label: t("ui.filterPanel.quick.sellerType"),
            active: sellerType !== "all",
          },
          {
            sectionId: "search-condition",
            label: t("ui.filterPanel.quick.condition"),
            active: conditions.length > 0,
          },
          {
            sectionId: "search-price",
            label: t("ui.filterPanel.quick.price"),
            active: minPrice !== undefined || maxPrice !== undefined,
          },
        ]}
        activeFilterCount={activeFilterCount + (query ? 1 : 0)}
        onOpenFilters={openFilters}
        actions={
          <IconButton
            onClick={handleSaveSearch}
            variant="outline"
            size="md"
            className="shrink-0"
            ariaLabel={t("search.searchPage.sauvegarderCetteRecherche")}
          >
            <Bookmark
              className="h-icon-sm w-icon-sm text-text-tertiary"
              aria-hidden="true"
            />
          </IconButton>
        }
        viewControls={
          <ViewModeToggle
            viewMode={viewMode}
            onChange={(mode) =>
              setSearchParams((current) => {
                const next = new URLSearchParams(current);
                if (mode === "grid") next.delete("view");
                else next.set("view", mode);
                return next;
              })
            }
            showMap={true}
            size="md"
          />
        }
        sortControl={
          <SearchSortControl>
            <DropdownMenu
              id="sort-select"
              ariaLabel="Trier les résultats"
              size="md"
              placement="bottom-right"
              panelWidth="w-48"
              className="shrink-0"
              triggerClassName="w-auto"
              mobileIcon={
                <ArrowUpDown className="w-icon-sm h-icon-sm text-text-emphasis" />
              }
              headerTitle={
                <div className="flex items-center gap-1.5 text-text-supporting normal-case font-semibold">
                  <ArrowUpDown className="w-icon-sm h-icon-sm text-primary shrink-0" />
                  <span>{t("search.searchPage.trierPar2")}</span>
                </div>
              }
              options={sortDropdownOptions}
              value={sortBy}
              onChange={(val) => updateFilter("sortBy", val)}
            />
          </SearchSortControl>
        }
      />

      {/* Active criteria stay removable here; result refinement lives in the
          adaptive filter panel. */}
      {(query || activeFilterCount > 0) && (
        <SearchActiveFiltersBar onClear={clearAllFilters}>
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

          {city && (
            <FilterChip onRemove={() => updateLocationFilter({})}>
              {radiusKm > 0 ? `${city} (+${radiusKm} km)` : city}
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
            <FilterChip onRemove={() => updateFilter("sellerType", undefined)}>
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
        </SearchActiveFiltersBar>
      )}

      <div className="w-full space-y-4">
        {/* Results Column */}
        <div aria-busy={searchQuery.isFetching} className="w-full space-y-4">
          {/* The card titles are `h3`, so without this the outline jumped
              straight from the page `h1` to `h3`. The count is already shown
              in the toolbar, so the heading is visually hidden rather than
              repeated on screen. */}
          <h2 className="sr-only">{t("search.resultsHeading")}</h2>

          {/* Results Display (Grid / List / Map) */}
          {isLoading ? (
            <ListingGrid>
              {[...Array(12)].map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </ListingGrid>
          ) : searchError ? (
            <StatePanel
              variant="error"
              title={t("common.error")}
              description={t("search.searchPage.loadError")}
              action={
                <Button onClick={() => void searchQuery.refetch()}>
                  {t("common.retry")}
                </Button>
              }
            />
          ) : listings.length > 0 ? (
            viewMode === "map" ? (
              <SearchMapResultsLayout
                resultsLabel={t("search.resultsHeading")}
                results={
                  <ListingGrid variant="list">
                    {listings.map((listing, index) => (
                      <div
                        key={listing.id}
                        data-search-map-result-card="true"
                        className="min-w-0"
                      >
                        <ListingCard
                          listing={listing}
                          variant="list"
                          imagePriority={page === 1 && index === 0}
                        />
                      </div>
                    ))}
                  </ListingGrid>
                }
                map={
                  <React.Suspense
                    fallback={
                      <div
                        role="status"
                        aria-label={t("common.loading")}
                        className="h-full overflow-hidden rounded-listing-card border border-border-base bg-bg-surface p-3"
                      >
                        <Skeleton className="h-full w-full rounded-listing-card" />
                      </div>
                    }
                  >
                    <ExploreMapView
                      listings={listings}
                      selectedCity={city || undefined}
                      onSelectCity={(selected) =>
                        updateFilter("city", selected)
                      }
                      fillHeight
                      showResultsSidebar={false}
                    />
                  </React.Suspense>
                }
              />
            ) : (
              <ListingGrid variant={viewMode === "list" ? "list" : "grid"}>
                {listings.map((listing, index) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    variant={viewMode === "list" ? "list" : "grid"}
                    imagePriority={page === 1 && index === 0}
                  />
                ))}
              </ListingGrid>
            )
          ) : (
            <NoResultsFound
              id="search-no-results"
              query={query}
              didYouMean={searchQuery.data?.didYouMean}
              onDidYouMean={(corrected) => updateFilter("query", corrected)}
              onClearFilters={clearAllFilters}
              clearFiltersLabel={t("search.searchPage.effacerTousLesFiltres")}
            />
          )}

          {!isLoading &&
            !searchError &&
            listings.length > 0 &&
            (page > 1 || hasNextPage || totalPages > 1) && (
              <nav
                aria-label="Pagination des résultats"
                className="flex items-center justify-center gap-1.5 pt-3"
              >
                <button
                  type="button"
                  onClick={() => updatePage(page - 1)}
                  disabled={page <= 1}
                  className={`inline-flex h-control-sm items-center gap-1 rounded-control border border-border-base bg-bg-surface px-2.5 text-xs font-semibold text-text-emphasis disabled:cursor-not-allowed disabled:opacity-40 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS}`}
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
                          className="px-1 text-xs text-text-inverse-subtle"
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
                      className={`h-control-sm min-w-8 rounded-control px-2 text-xs font-semibold ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} ${
                        pageNumber === page
                          ? "bg-primary text-on-primary"
                          : "border border-border-base bg-bg-surface text-text-emphasis hover:bg-bg-subtle"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  </React.Fragment>
                ))}

                <button
                  type="button"
                  onClick={() => updatePage(page + 1)}
                  disabled={!hasNextPage && page >= totalPages}
                  className={`inline-flex h-control-sm items-center gap-1 rounded-control border border-border-base bg-bg-surface px-2.5 text-xs font-semibold text-text-emphasis disabled:cursor-not-allowed disabled:opacity-40 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS}`}
                  aria-label="Page suivante"
                >
                  <span className="hidden sm:inline">Suivante</span>
                  <ChevronRight className="h-icon-sm w-icon-sm" />
                </button>
              </nav>
            )}
        </div>
      </div>

      <SearchFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={closeFilters}
        title={t("search.searchPage.filtresDeRecherche")}
      >
        <FilterPanel
          id="search-filter-panel"
          activeSectionId={activeFilterSection}
          onReset={clearAllFilters}
          footer={
            <Button variant="primary" fullWidth onClick={closeFilters}>
              Voir les résultats ({totalCount})
            </Button>
          }
        >
          {/* Category */}
          <div data-filter-section="search-category">
            <label className="text-xs font-semibold text-text-emphasis uppercase tracking-wider block mb-2">
              {t("search.searchPage.categorie")}
            </label>
            <DropdownMenu
              id="search-filter-category"
              ariaLabel="Filtrer par catégorie"
              fullWidth
              searchable
              searchPlaceholder="Rechercher une catégorie…"
              headerTitle={
                <div className="flex items-center gap-1.5 text-text-supporting normal-case font-semibold">
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
                <label className="text-micro font-semibold text-text-supporting block mb-1.5">
                  {t("search.searchPage.sousCategorie")}
                </label>
                <DropdownMenu
                  id="search-filter-subcategory"
                  ariaLabel="Filtrer par sous-catégorie"
                  fullWidth
                  searchable={subcategoryDropdownOptions.length > 5}
                  searchPlaceholder="Rechercher une sous-catégorie…"
                  headerTitle={
                    <div className="flex items-center gap-1.5 text-text-supporting normal-case font-semibold">
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

          <div data-filter-section="search-location">
            <label
              htmlFor="search-filter-location"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-emphasis"
            >
              {t("search.searchPage.localisation")}
            </label>
            <LocationSelector
              id="search-filter-location"
              city={city}
              radiusKm={city ? radiusKm : undefined}
              onChange={updateLocationFilter}
            />
          </div>

          {/* Seller type */}
          <div data-filter-section="search-seller">
            <label className="text-xs font-semibold text-text-emphasis uppercase tracking-wider block mb-2">
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
                  aria-pressed={sellerType === s.value}
                  className={`h-control-md px-2 text-xs font-semibold rounded-control border text-center ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer ${
                    sellerType === s.value
                      ? "bg-primary text-on-primary border-primary shadow-xs"
                      : "bg-bg-surface text-text-emphasis border-border-base hover:bg-surface-soft"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div data-filter-section="search-condition">
            <span className="text-xs font-bold text-text-emphasis uppercase tracking-wider block mb-2">
              {t("search.searchPage.etat")}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {CONDITION_FILTER_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="touch-row gap-2 rounded-control border border-border-subtle px-2 py-1.5 text-xs font-medium text-text-emphasis cursor-pointer"
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
          <div data-filter-section="search-price">
            <span className="text-xs font-bold text-text-emphasis uppercase tracking-wider block mb-2">
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
          <div className="space-y-2.5">
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
            <div className="space-y-3">
              <span className="text-xs font-bold text-text-main uppercase tracking-wider block">
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
                      <label className="text-xs font-semibold text-text-emphasis block">
                        {attr.label}
                      </label>
                      <DropdownMenu
                        id={`search-filter-attr-${attr.code}`}
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
                      <label className="text-xs font-semibold text-text-emphasis block">
                        {attr.label} {attr.unit ? `(${attr.unit})` : ""}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          aria-label={t(
                            "search.searchPage.minimumForAttribute",
                            {
                              attribute: attr.label,
                            },
                          )}
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
                          aria-label={t(
                            "search.searchPage.maximumForAttribute",
                            {
                              attribute: attr.label,
                            },
                          )}
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
      </SearchFilterDrawer>
    </Container>
  );
};
