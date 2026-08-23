import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Layers,
  ChevronDown,
  X,
  Check,
  Compass,
} from "lucide-react";
import { TAXONOMY } from "../../domains/taxonomy/taxonomy.data";
import { getTaxonomyLabel } from "../../domains/taxonomy/taxonomy.service";
import { CategoryIcon } from "./CategoryIcon";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { routes } from "../../configuration/routes";
import {
  SEARCH_PLACEHOLDER,
  getSearchSuggestions,
  AutocompleteResults,
} from "../../configuration/search.config";
import {
  SearchAutocomplete,
  AutocompleteSelection,
} from "./SearchAutocomplete";
import { storageService } from "../../services/storage.service";
import { useTranslation } from "../../i18n/I18nProvider";
import {
  DropdownMenu,
  DROPDOWN_PANEL_CLASSES,
  DROPDOWN_HEADER_CLASSES,
  DROPDOWN_HEADER_TITLE_CLASSES,
  DROPDOWN_ITEM_CLASSES,
  DROPDOWN_SEARCH_INPUT_CLASSES,
} from "./DropdownMenu";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../utils/controlMetrics";

export interface GlobalSearchCriteria {
  query: string;
  categorySlug?: string;
  subCategorySlug?: string;
  city?: string;
  radiusKm?: number;
}

export interface GlobalSearchBarProps {
  /**
   * Layout variant:
   * - 'hero': Prominent multi-field card layout with category picker, keyword field, location trigger, and large search button (ideal for Homepage Hero).
   * - 'header': Sleek segmented bar for the sticky desktop header with category dropdown, keyword field, and location trigger.
   * - 'search-page': Multi-field bar for top of search results page with direct filter synchronization and optional radius control.
   * - 'minimal': Single-row or stacked compact variant for mobile drawers or tight spaces.
   */
  variant?: "hero" | "header" | "search-page" | "minimal";
  initialQuery?: string;
  initialCategorySlug?: string;
  initialSubCategorySlug?: string;
  initialCity?: string;
  initialRadiusKm?: number;
  showCategory?: boolean;
  showLocation?: boolean;
  showRadius?: boolean;
  placeholder?: string;
  className?: string;
  idPrefix?: string;
  autoFocus?: boolean;
  onSearch?: (criteria: GlobalSearchCriteria) => void;
  /** Notifies a shell when the field contains text, without coupling it to search state. */
  onQueryChange?: (query: string) => void;
  /** Notifies a shell when the header field becomes the active interaction. */
  onFocus?: () => void;
  /** Notifies a shell after the clear action restores an empty field. */
  onClearQuery?: () => void;
  /** When true (default: true if no onSearch or when onSearch completes), navigates to /recherche */
  navigateOnSubmit?: boolean;
  /** Callback triggered when search is submitted (e.g. to close a mobile drawer) */
  onSubmitComplete?: () => void;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  variant = "hero",
  initialQuery = "",
  initialCategorySlug = "",
  initialSubCategorySlug = "",
  initialCity,
  initialRadiusKm,
  showCategory = true,
  showLocation = true,
  showRadius = false,
  placeholder,
  className = "",
  idPrefix = "global-search",
  autoFocus = false,
  onSearch,
  onQueryChange,
  onFocus,
  onClearQuery,
  navigateOnSubmit = true,
  onSubmitComplete,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    location: userLocation,
    openLocationModal,
    activeMarket,
  } = useMarketLocation();

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategorySlug, setSelectedCategorySlug] =
    useState(initialCategorySlug);
  const [selectedSubCategorySlug, setSelectedSubCategorySlug] = useState(
    initialSubCategorySlug,
  );
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [categoryFilterText, setCategoryFilterText] = useState("");

  // Autocomplete state
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const isCountryWide =
    userLocation.city.startsWith("Tout") ||
    userLocation.city.startsWith("Toute");
  const effectiveCity =
    initialCity !== undefined
      ? initialCity
      : !isCountryWide
        ? userLocation.city
        : "";
  const [city, setCity] = useState(effectiveCity);
  const [radiusKm, setRadiusKm] = useState<number | undefined>(
    initialRadiusKm ?? userLocation.radiusKm ?? 0,
  );

  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync recent searches from storage
  useEffect(() => {
    try {
      setRecentSearches(storageService.getRecentSearches());
    } catch {
      setRecentSearches([]);
    }
  }, [isAutocompleteOpen]);

  // Sync state with props when initial values change
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setSelectedCategorySlug(initialCategorySlug);
  }, [initialCategorySlug]);

  useEffect(() => {
    setSelectedSubCategorySlug(initialSubCategorySlug);
  }, [initialSubCategorySlug]);

  useEffect(() => {
    if (initialCity !== undefined) {
      setCity(initialCity);
    } else if (!isCountryWide) {
      setCity(userLocation.city);
    } else {
      setCity("");
    }
  }, [initialCity, userLocation.city, isCountryWide]);

  useEffect(() => {
    if (initialRadiusKm !== undefined) {
      setRadiusKm(initialRadiusKm);
    }
  }, [initialRadiusKm]);

  // Derive autocomplete suggestions
  const suggestions: AutocompleteResults = useMemo(() => {
    return getSearchSuggestions(query, selectedCategorySlug, 5);
  }, [query, selectedCategorySlug]);

  // Total selectable items in autocomplete dropdown
  const totalSelectableCount = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed) {
      // categories + keywords + 1 (direct search query item)
      return suggestions.categories.length + suggestions.keywords.length + 1;
    }
    // recent searches (max 4)
    return Math.min(recentSearches.length, 4);
  }, [query, suggestions, recentSearches]);

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isCategoryMenuOpen && !isAutocompleteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      /* Focus has to go back to whatever opened the popover. Closing without
         restoring it dropped the user on `<body>`, which means re-tabbing the
         whole header to get back to where they were. The dialog primitives
         already do this — the popovers never did. */
      if (isCategoryMenuOpen) {
        setIsCategoryMenuOpen(false);
        document
          .getElementById(`${idPrefix}-header-category-button`)
          ?.focus();
      }
      if (isAutocompleteOpen) {
        setIsAutocompleteOpen(false);
        searchInputRef.current?.focus();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(target)
      ) {
        setIsCategoryMenuOpen(false);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target)
      ) {
        setIsAutocompleteOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isCategoryMenuOpen, isAutocompleteOpen, idPrefix]);

  // Find active category
  const activeCategory = TAXONOMY.find(
    (cat) => cat.slug === selectedCategorySlug,
  );
  const activeCategoryLabel = activeCategory
    ? getTaxonomyLabel(activeCategory, "compact")
    : "Catégories";

  // Filtered categories for dropdown search
  const filteredCategories = TAXONOMY.filter((cat) => {
    if (!categoryFilterText.trim()) return true;
    const search = categoryFilterText.toLowerCase();
    return (
      cat.name.toLowerCase().includes(search) ||
      getTaxonomyLabel(cat, "compact").toLowerCase().includes(search) ||
      cat.slug.toLowerCase().includes(search) ||
      cat.subCategories.some(
        (sub) =>
          sub.name.toLowerCase().includes(search) ||
          getTaxonomyLabel(sub, "compact").toLowerCase().includes(search),
      )
    );
  });

  const handleCategorySelect = (categorySlug?: string) => {
    setSelectedCategorySlug(categorySlug || "");
    setSelectedSubCategorySlug("");
    setIsCategoryMenuOpen(false);
    setCategoryFilterText("");
  };

  const handleClearQuery = () => {
    setQuery("");
    onQueryChange?.("");
    setSelectedIndex(-1);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    onClearQuery?.();
  };

  const executeSearch = (customCriteria?: Partial<GlobalSearchCriteria>) => {
    const finalQuery = (
      customCriteria?.query !== undefined ? customCriteria.query : query
    ).trim();
    const finalCategory =
      customCriteria?.categorySlug !== undefined
        ? customCriteria.categorySlug
        : selectedCategorySlug;
    const finalSubCategory =
      customCriteria?.subCategorySlug !== undefined
        ? customCriteria.subCategorySlug
        : selectedSubCategorySlug;

    if (finalQuery) {
      try {
        storageService.addRecentSearch(finalQuery);
        setRecentSearches(storageService.getRecentSearches());
      } catch (e) {
        console.error(e);
      }
    }

    setIsAutocompleteOpen(false);

    const criteria: GlobalSearchCriteria = {
      query: finalQuery,
      categorySlug: finalCategory || undefined,
      subCategorySlug: finalSubCategory || undefined,
      city: city || undefined,
      radiusKm: radiusKm && radiusKm > 0 ? radiusKm : undefined,
    };

    if (onSearch) {
      onSearch(criteria);
    }

    if (navigateOnSubmit) {
      const targetUrl = routes.search({
        query: criteria.query || undefined,
        category: criteria.categorySlug,
        subCategory: criteria.subCategorySlug,
        city: criteria.city,
        radius: criteria.radiusKm,
      });
      navigate(targetUrl);
    }

    if (onSubmitComplete) {
      onSubmitComplete();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  const handleAutocompleteSelect = (selection: AutocompleteSelection) => {
    if (selection.query !== undefined) {
      setQuery(selection.query);
      onQueryChange?.(selection.query);
    }
    if (selection.categorySlug !== undefined) {
      setSelectedCategorySlug(selection.categorySlug);
    }
    if (selection.subCategorySlug !== undefined) {
      setSelectedSubCategorySlug(selection.subCategorySlug);
    }

    if (selection.submitImmediately) {
      executeSearch({
        query: selection.query,
        categorySlug: selection.categorySlug,
        subCategorySlug: selection.subCategorySlug,
      });
    } else {
      setIsAutocompleteOpen(false);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  };

  const handleClearRecentSearch = (searchItem: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = recentSearches.filter((s) => s !== searchItem);
      storageService.setByKey("shongre_recent_searches_v1", updated);
      setRecentSearches(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      storageService.setByKey("shongre_recent_searches_v1", []);
      setRecentSearches([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isAutocompleteOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsAutocompleteOpen(true);
      return;
    }

    if (!isAutocompleteOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < totalSelectableCount - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : totalSelectableCount - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0) {
        const trimmed = e.currentTarget.value.trim();
        if (trimmed) {
          const numCats = suggestions.categories.length;
          const numKws = suggestions.keywords.length;

          if (selectedIndex < numCats) {
            const cat = suggestions.categories[selectedIndex];
            handleAutocompleteSelect({
              query: trimmed,
              categorySlug: cat.isSubCategory ? cat.parentSlug : cat.slug,
              subCategorySlug: cat.isSubCategory ? cat.slug : undefined,
              submitImmediately: true,
            });
          } else if (selectedIndex < numCats + numKws) {
            const kw = suggestions.keywords[selectedIndex - numCats];
            handleAutocompleteSelect({
              query: kw.keyword,
              categorySlug: kw.categorySlug,
              subCategorySlug: kw.subCategorySlug,
              submitImmediately: true,
            });
          } else {
            // Direct query search
            handleAutocompleteSelect({
              query: trimmed,
              categorySlug: selectedCategorySlug,
              submitImmediately: true,
            });
          }
        } else {
          // Empty query: recent searches
          if (selectedIndex < recentSearches.length) {
            const recent = recentSearches[selectedIndex];
            handleAutocompleteSelect({
              query: recent,
              submitImmediately: true,
            });
          }
        }
      } else {
        executeSearch({
          query: e.currentTarget.value.trim(),
          categorySlug: selectedCategorySlug,
          subCategorySlug: selectedSubCategorySlug,
        });
      }
    } else if (e.key === "Escape") {
      setIsAutocompleteOpen(false);
    }
  };

  // The header field shares its row with the logo, market selector and five
  // action items, so the long placeholder truncated mid-word to "Que recher".
  // The examples it carried are already offered by the autocomplete panel, which
  // shows trending searches as soon as the field is focused.
  const isNarrowSurface = variant === "minimal" || variant === "header";
  const resolvedPlaceholder =
    placeholder ||
    (isNarrowSurface ? SEARCH_PLACEHOLDER.compact : SEARCH_PLACEHOLDER.full);

  // ---------------------------------------------------------------------------
  // Variant: HEADER (Desktop Header Bar)
  // ---------------------------------------------------------------------------
  if (variant === "header") {
    return (
      <div className="relative w-full min-w-0" ref={searchContainerRef}>
        <form
          role="search"
          aria-label={t("ui.globalSearchBar.rechercheGlobale")}
          onSubmit={handleSubmit}
          className={`flex items-stretch h-control-md w-full min-w-0 bg-bg-base border border-border-base rounded-control overflow-visible focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-bg-surface focus-within:shadow-xs ${CONTROL_MOTION_CLASS} ${className}`}
        >
          {/* Category Trigger Dropdown.
              Hidden below `lg`: between 768px and 1024px the category picker and
              the location trigger together left the keyword field with almost no
              room and pushed the whole header past the viewport. On tablet the
              bar narrows to keyword + submit, and category/location stay
              reachable from the results page filters. */}
          {showCategory && (
            <div
              className="relative shrink hidden lg:flex items-center min-w-0"
              ref={categoryDropdownRef}
            >
              <button
                id={`${idPrefix}-header-category-button`}
                type="button"
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                aria-expanded={isCategoryMenuOpen}
                aria-haspopup="dialog"
                aria-controls={`${idPrefix}-header-category-menu`}
                aria-label={t("ui.globalSearchBar.selectionnerUneCategorie")}
                className={`h-full flex items-center gap-1.5 px-3 border-r border-border-base text-xs font-bold ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer rounded-l-control focus:outline-none focus-visible:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset min-w-0 w-full ${
                  selectedCategorySlug
                    ? "bg-primary-light text-primary hover:bg-primary-light/80"
                    : "text-stone-700 hover:bg-bg-subtle"
                }`}
              >
                {activeCategory ? (
                  <CategoryIcon category={activeCategory} size="xs" />
                ) : (
                  <Layers className="w-3.5 h-3.5 text-stone-500" />
                )}
                <span className="max-w-[56px] xl:max-w-[104px] truncate">
                  {activeCategoryLabel}
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-stone-500 transition-transform ${
                    isCategoryMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isCategoryMenuOpen && (
                <div
                  id={`${idPrefix}-header-category-menu`}
                  /* A `group`, not a `menu`: it holds a filter textbox, and
                     `menu` forbids that. The choices below carry the listbox
                     semantics instead. */
                  role="group"
                  aria-label={t("ui.globalSearchBar.filtrerParCategorie")}
                  className={`absolute top-full left-0 mt-1.5 w-72 ${DROPDOWN_PANEL_CLASSES}`}
                >
                  <div className={DROPDOWN_HEADER_CLASSES}>
                    <div className={DROPDOWN_HEADER_TITLE_CLASSES}>
                      <span>{t("ui.globalSearchBar.filtrerParCategorie")}</span>
                    </div>
                    <input
                      type="text"
                      placeholder={t(
                        "ui.globalSearchBar.rechercherUneCategorie",
                      )}
                      value={categoryFilterText}
                      onChange={(e) => setCategoryFilterText(e.target.value)}
                      className={DROPDOWN_SEARCH_INPUT_CLASSES}
                      autoFocus
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCategorySelect(undefined)}
                    className={`${DROPDOWN_ITEM_CLASSES.base} ${
                      !selectedCategorySlug
                        ? DROPDOWN_ITEM_CLASSES.selected
                        : DROPDOWN_ITEM_CLASSES.unselected
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-stone-500" />
                      <span>{t("ui.globalSearchBar.toutesLesCategories")}</span>
                    </div>
                    {!selectedCategorySlug && (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    )}
                  </button>

                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.slug)}
                      className={`${DROPDOWN_ITEM_CLASSES.base} ${
                        selectedCategorySlug === cat.slug
                          ? DROPDOWN_ITEM_CLASSES.selected
                          : DROPDOWN_ITEM_CLASSES.unselected
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <CategoryIcon category={cat} size="xs" />
                        <span className="truncate">
                          {getTaxonomyLabel(cat, "compact")}
                        </span>
                      </div>
                      {selectedCategorySlug === cat.slug && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search Keyword Input with Autocomplete.

              The floor is a real one, not a token gesture: at `lg` the category
              and location triggers appear, and a `min-w-[60px]` field was
              squeezed down to a 32px sliver showing a single letter of its own
              placeholder. The triggers shrink before the field does now. */}
          <div className="flex-1 min-w-[9rem] relative flex items-center pl-3">
            <Search className="w-4 h-4 text-stone-400 shrink-0" />
            <input
              ref={searchInputRef}
              id={`${idPrefix}-header-query-input`}
              type="search"
              aria-label={t("ui.globalSearchBar.rechercherUneAnnonce")}
              role="combobox"
              aria-expanded={isAutocompleteOpen}
              aria-autocomplete="list"
              /* Focus stays on the input while the arrows move the highlight, so
                 this is the only channel a screen reader has to say which
                 suggestion is active. Without it the list was silent. */
              aria-activedescendant={
                isAutocompleteOpen && selectedIndex >= 0
                  ? `${idPrefix}-autocomplete-item-${selectedIndex}`
                  : undefined
              }
              aria-controls={`${idPrefix}-autocomplete-dropdown`}
              placeholder={resolvedPlaceholder}
              value={query}
              onChange={(e) => {
                const nextQuery = e.target.value;
                setQuery(nextQuery);
                onQueryChange?.(nextQuery);
                setSelectedIndex(-1);
                setIsAutocompleteOpen(true);
              }}
              onFocus={() => {
                onFocus?.();
                setIsAutocompleteOpen(true);
              }}
              onKeyDown={handleInputKeyDown}
              autoFocus={autoFocus}
              className="w-full h-full px-2.5 text-xs sm:text-sm text-stone-900 placeholder:text-stone-500 bg-transparent focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={handleClearQuery}
                aria-label={t("ui.globalSearchBar.effacerLeTexte")}
                className={`inline-flex items-center justify-center w-6 h-6 mr-1.5 text-stone-500 hover:text-stone-700 rounded-full hover:bg-bg-muted ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer shrink-0`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Location Trigger Button (desktop only — see the category note above) */}
          {showLocation && (
            <button
              id={`${idPrefix}-header-location-button`}
              type="button"
              onClick={openLocationModal}
              aria-label={`Localisation : ${city || userLocation.label}`}
              className={`hidden xl:flex items-center gap-1.5 px-3.5 h-full border-l border-border-base text-xs font-medium text-stone-700 hover:bg-bg-subtle ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer shrink min-w-0 max-w-[110px] 2xl:max-w-[180px] focus:outline-none focus-visible:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset`}
            >
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate whitespace-nowrap">
                {city || userLocation.label}
              </span>
            </button>
          )}

          {/* Submit Button */}
          <button
            id={`${idPrefix}-header-submit-button`}
            type="submit"
            aria-label={t("ui.globalSearchBar.lancerLaRecherche")}
            /* Negative margins pull the button over the form's 1px border so it
               reaches the outer edge — otherwise a pale 1px rim traced the top,
               right and bottom of the orange block and read as a seam. The radius
               matches the form's *outer* 10px, not the inner 11px. */
            className={`bg-primary hover:bg-primary-hover active:bg-primary-active text-white px-4 -my-px -mr-px h-[calc(100%+2px)] flex items-center justify-center font-bold text-xs ${CONTROL_MOTION_CLASS} cursor-pointer shrink-0 rounded-r-control focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset`}
          >
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Autocomplete Dropdown */}
        <SearchAutocomplete
          idPrefix={`${idPrefix}-autocomplete`}
          isOpen={isAutocompleteOpen}
          query={query}
          categories={suggestions.categories}
          keywords={suggestions.keywords}
          trending={suggestions.trending}
          recentSearches={recentSearches}
          activeCategorySlug={selectedCategorySlug}
          selectedIndex={selectedIndex}
          onSelect={handleAutocompleteSelect}
          onClearRecentSearch={handleClearRecentSearch}
          onClearAllRecentSearches={handleClearAllRecentSearches}
          onClose={() => setIsAutocompleteOpen(false)}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Variant: MINIMAL (Mobile Drawer or Compact Bar)
  // ---------------------------------------------------------------------------
  if (variant === "minimal") {
    return (
      <div className="relative" ref={searchContainerRef}>
        <form
          role="search"
          aria-label={t("ui.globalSearchBar.rechercheMobile")}
          onSubmit={handleSubmit}
          className={`space-y-2.5 ${className}`}
        >
          <div className="relative flex items-center">
            <input
              ref={searchInputRef}
              id={`${idPrefix}-minimal-query-input`}
              type="search"
              role="combobox"
              aria-expanded={isAutocompleteOpen}
              aria-autocomplete="list"
              /* Focus stays on the input while the arrows move the highlight, so
                 this is the only channel a screen reader has to say which
                 suggestion is active. Without it the list was silent. */
              aria-activedescendant={
                isAutocompleteOpen && selectedIndex >= 0
                  ? `${idPrefix}-autocomplete-item-${selectedIndex}`
                  : undefined
              }
              aria-controls={`${idPrefix}-autocomplete-dropdown`}
              aria-label={t("ui.globalSearchBar.rechercherUneAnnonce")}
              placeholder={resolvedPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(-1);
                setIsAutocompleteOpen(true);
              }}
              onFocus={() => setIsAutocompleteOpen(true)}
              onKeyDown={handleInputKeyDown}
              autoFocus={autoFocus}
              className="w-full h-control-md pl-9 pr-9 text-xs text-stone-900 placeholder:text-stone-400 bg-bg-base border border-border-base rounded-control focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-stone-400 pointer-events-none" />
            {query && (
              <button
                type="button"
                onClick={handleClearQuery}
                aria-label={t("ui.globalSearchBar.effacerLeTexte")}
                className={`absolute right-2.5 inline-flex items-center justify-center w-6 h-6 text-stone-500 hover:text-stone-700 rounded-full hover:bg-bg-muted ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category & Location Mobile Selectors */}
          {(showCategory || showLocation) && (
            <div className="grid grid-cols-2 gap-2">
              {showCategory && (
                <div className="relative" ref={categoryDropdownRef}>
                  <button
                    id={`${idPrefix}-minimal-category-button`}
                    type="button"
                    onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                    className={`w-full h-control-md flex items-center justify-between px-2.5 rounded-control border text-xs font-semibold ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer ${
                      selectedCategorySlug
                        ? "bg-primary-light border-primary-border text-primary"
                        : "bg-bg-base border-border-base text-stone-700 hover:bg-bg-subtle"
                    }`}
                  >
                    <span className="truncate">{activeCategoryLabel}</span>
                    <ChevronDown className="w-3 h-3 shrink-0 ml-1" />
                  </button>

                  {isCategoryMenuOpen && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-bg-surface rounded-card shadow-dropdown border border-border-base py-1.5 z-popover max-h-60 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => handleCategorySelect(undefined)}
                        className="w-full px-3 py-1.5 text-xs text-left font-bold hover:bg-bg-subtle text-stone-800"
                      >
                        {t("ui.globalSearchBar.toutesLesCategories2")}
                      </button>
                      {TAXONOMY.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategorySelect(cat.slug)}
                          className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-primary-light ${
                            selectedCategorySlug === cat.slug
                              ? "font-bold text-primary bg-primary-light"
                              : "text-stone-700"
                          }`}
                        >
                          <CategoryIcon category={cat} size="xs" />
                          <span className="truncate">
                            {getTaxonomyLabel(cat, "compact")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {showLocation && (
                <button
                  id={`${idPrefix}-minimal-location-button`}
                  type="button"
                  onClick={openLocationModal}
                  className={`w-full h-control-md flex items-center justify-between px-2.5 rounded-control border border-border-base bg-bg-base hover:bg-bg-subtle text-xs font-semibold text-stone-700 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer truncate`}
                >
                  <div className="flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      {city || userLocation.label}
                    </span>
                  </div>
                  <span className="text-micro text-primary font-bold shrink-0 ml-1">
                    Changer
                  </span>
                </button>
              )}
            </div>
          )}

          <button
            id={`${idPrefix}-minimal-submit-button`}
            type="submit"
            className={`w-full h-control-md rounded-control bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs ${CONTROL_MOTION_CLASS} cursor-pointer`}
          >
            <Search className="w-4 h-4" />
            <span>Rechercher</span>
          </button>
        </form>

        {/* Autocomplete Dropdown */}
        <SearchAutocomplete
          idPrefix={`${idPrefix}-autocomplete`}
          isOpen={isAutocompleteOpen}
          query={query}
          categories={suggestions.categories}
          keywords={suggestions.keywords}
          trending={suggestions.trending}
          recentSearches={recentSearches}
          activeCategorySlug={selectedCategorySlug}
          selectedIndex={selectedIndex}
          onSelect={handleAutocompleteSelect}
          onClearRecentSearch={handleClearRecentSearch}
          onClearAllRecentSearches={handleClearAllRecentSearches}
          onClose={() => setIsAutocompleteOpen(false)}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Variant: SEARCH-PAGE (Search Results Top Bar)
  // ---------------------------------------------------------------------------
  if (variant === "search-page") {
    return (
      <div className="relative" ref={searchContainerRef}>
        <form
          role="search"
          aria-label={t("ui.globalSearchBar.rechercheEtFiltres")}
          onSubmit={handleSubmit}
          className={`flex flex-row flex-wrap sm:flex-nowrap gap-2 ${className}`}
        >
          {/* Category Trigger Dropdown on Search Page.
              Hidden below sm: the mobile filter drawer already carries category,
              sub-category and location, and stacking them here pushed the first
              result off the fold. */}
          {showCategory && (
            <div
              className="relative shrink-0 hidden sm:block"
              ref={categoryDropdownRef}
            >
              <button
                id={`${idPrefix}-page-category-button`}
                type="button"
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                aria-expanded={isCategoryMenuOpen}
                aria-haspopup="dialog"
                className={`h-control-touch px-3.5 rounded-control border text-xs font-semibold flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer ${
                  selectedCategorySlug
                    ? "bg-primary-light border-primary-border text-primary font-bold"
                    : "bg-bg-base border-border-base hover:bg-bg-subtle text-stone-700"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {activeCategory ? (
                    <CategoryIcon category={activeCategory} size="xs" />
                  ) : (
                    <Layers className="w-3.5 h-3.5 text-stone-500" />
                  )}
                  <span className="truncate max-w-[130px]">
                    {activeCategoryLabel}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3 h-3 text-stone-400 transition-transform shrink-0 ${
                    isCategoryMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isCategoryMenuOpen && (
                <div
                  id={`${idPrefix}-page-category-menu`}
                  /* A `group`, not a `menu`: it holds a filter textbox, and
                     `menu` forbids that. The choices below carry the listbox
                     semantics instead. */
                  role="group"
                  aria-label={t("ui.globalSearchBar.filtrerParCategorie")}
                  className={`absolute top-full left-0 mt-1.5 w-72 ${DROPDOWN_PANEL_CLASSES}`}
                >
                  <div className={DROPDOWN_HEADER_CLASSES}>
                    <div className={DROPDOWN_HEADER_TITLE_CLASSES}>
                      <div className="flex items-center gap-1.5 text-stone-600 normal-case font-semibold">
                        <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{t("ui.globalSearchBar.categories")}</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder={t("ui.globalSearchBar.filtrerLesCategories")}
                      value={categoryFilterText}
                      onChange={(e) => setCategoryFilterText(e.target.value)}
                      className={DROPDOWN_SEARCH_INPUT_CLASSES}
                      autoFocus
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCategorySelect(undefined)}
                    className={`${DROPDOWN_ITEM_CLASSES.base} ${
                      !selectedCategorySlug
                        ? DROPDOWN_ITEM_CLASSES.selected
                        : DROPDOWN_ITEM_CLASSES.unselected
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-stone-500" />
                      <span>{t("ui.globalSearchBar.toutesLesCategories")}</span>
                    </div>
                    {!selectedCategorySlug && (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    )}
                  </button>

                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.slug)}
                      className={`${DROPDOWN_ITEM_CLASSES.base} ${
                        selectedCategorySlug === cat.slug
                          ? DROPDOWN_ITEM_CLASSES.selected
                          : DROPDOWN_ITEM_CLASSES.unselected
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <CategoryIcon category={cat} size="xs" />
                        <span className="truncate">
                          {getTaxonomyLabel(cat, "compact")}
                        </span>
                      </div>
                      {selectedCategorySlug === cat.slug && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Keyword Search Input */}
          <div className="flex-1 min-w-0 relative flex items-center">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5" />
            <input
              ref={searchInputRef}
              id={`${idPrefix}-page-query-input`}
              type="search"
              aria-label={t("ui.globalSearchBar.rechercherUneAnnonce")}
              role="combobox"
              aria-expanded={isAutocompleteOpen}
              aria-autocomplete="list"
              /* Focus stays on the input while the arrows move the highlight, so
                 this is the only channel a screen reader has to say which
                 suggestion is active. Without it the list was silent. */
              aria-activedescendant={
                isAutocompleteOpen && selectedIndex >= 0
                  ? `${idPrefix}-autocomplete-item-${selectedIndex}`
                  : undefined
              }
              aria-controls={`${idPrefix}-autocomplete-dropdown`}
              placeholder={resolvedPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(-1);
                setIsAutocompleteOpen(true);
              }}
              onFocus={() => setIsAutocompleteOpen(true)}
              onKeyDown={handleInputKeyDown}
              className="w-full h-control-touch pl-10 pr-9 bg-bg-base text-sm text-stone-900 rounded-control border border-border-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {query && (
              <button
                type="button"
                onClick={handleClearQuery}
                aria-label={t("ui.globalSearchBar.effacerLeTexte")}
                className={`absolute right-3 inline-flex items-center justify-center w-6 h-6 text-stone-500 hover:text-stone-700 rounded-full hover:bg-bg-muted ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Location & Radius */}
          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            {showLocation && (
              <button
                id={`${idPrefix}-page-location-button`}
                type="button"
                onClick={openLocationModal}
                aria-label={`Localisation : ${city || userLocation.label}`}
                className="hidden sm:flex h-control-touch px-3.5 rounded-control border border-border-base bg-bg-base hover:bg-bg-subtle text-xs font-semibold text-stone-700 items-center gap-1.5 cursor-pointer max-w-full sm:max-w-[160px] truncate"
              >
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">{city || userLocation.label}</span>
              </button>
            )}

            {showRadius && city && !isCountryWide && (
              <div className="hidden sm:block">
                <DropdownMenu
                  id={`${idPrefix}-page-radius-select`}
                  ariaLabel="Rayon de recherche autour de la ville"
                  size="touch"
                  panelWidth="w-40"
                  headerTitle={
                    <div className="flex items-center gap-1.5 text-stone-600 normal-case font-semibold">
                      <Compass className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Rayon</span>
                    </div>
                  }
                  options={[
                    { value: "0", label: "Ville exacte" },
                    { value: "10", label: "+10 km" },
                    { value: "30", label: "+30 km" },
                    { value: "50", label: "+50 km" },
                    { value: "100", label: "+100 km" },
                  ]}
                  value={String(radiusKm || 0)}
                  onChange={(val) => setRadiusKm(Number(val))}
                />
              </div>
            )}

            <button
              id={`${idPrefix}-page-submit-button`}
              type="submit"
              className={`h-control-touch px-3.5 sm:px-5 rounded-control bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer shrink-0`}
              aria-label={t("ui.globalSearchBar.lancerLaRecherche")}
            >
              <Search className="w-4 h-4" />
              {/* Was "Filtrer" — on a submit button whose accessible name is
                  "Lancer la recherche". Two problems in one word: it read as a
                  third filter control beside the real ones, and a voice-control
                  user saying "click Filtrer" hit nothing, because the visible
                  label was absent from the accessible name (WCAG 2.5.3). */}
              <span className="hidden sm:inline">
                {t("ui.globalSearchBar.lancerLaRecherche")}
              </span>
            </button>
          </div>
        </form>

        {/* Autocomplete Dropdown */}
        <SearchAutocomplete
          idPrefix={`${idPrefix}-autocomplete`}
          isOpen={isAutocompleteOpen}
          query={query}
          categories={suggestions.categories}
          keywords={suggestions.keywords}
          trending={suggestions.trending}
          recentSearches={recentSearches}
          activeCategorySlug={selectedCategorySlug}
          selectedIndex={selectedIndex}
          onSelect={handleAutocompleteSelect}
          onClearRecentSearch={handleClearRecentSearch}
          onClearAllRecentSearches={handleClearAllRecentSearches}
          onClose={() => setIsAutocompleteOpen(false)}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Variant: HERO (Default prominent search bar for Homepage Hero)
  // ---------------------------------------------------------------------------
  return (
    <div
      ref={searchContainerRef}
      className={`relative bg-bg-surface p-1.5 sm:p-2.5 rounded-card border border-border-base shadow-lg hover:border-border-hover ${CONTROL_MOTION_CLASS} ${className}`}
    >
      <form
        role="search"
        aria-label={t(
          "ui.globalSearchBar.recherchePrincipaleDePetitesAnnonces",
        )}
        onSubmit={handleSubmit}
        className="flex flex-col md:flex-row items-stretch md:items-center gap-2"
      >
        {/* 1. Category Selector */}
        {showCategory && (
          <div className="relative shrink-0" ref={categoryDropdownRef}>
            <button
              id={`${idPrefix}-hero-category-button`}
              type="button"
              onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
              aria-expanded={isCategoryMenuOpen}
              aria-haspopup="dialog"
              aria-label={t("ui.globalSearchBar.filtrerParCategorie")}
              className={`w-full md:w-auto h-control-touch px-3.5 rounded-control border text-xs font-bold flex items-center justify-between md:justify-start gap-2 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer ${
                selectedCategorySlug
                  ? "bg-primary-light border-primary-border text-primary"
                  : "bg-bg-base hover:bg-bg-subtle text-stone-800 border-border-base hover:border-stone-300"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {activeCategory ? (
                  <CategoryIcon category={activeCategory} size="xs" />
                ) : (
                  <Layers className="w-4 h-4 text-stone-500" />
                )}
                <span className="truncate max-w-[130px]">
                  {activeCategoryLabel}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-stone-400 transition-transform shrink-0 ${
                  isCategoryMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isCategoryMenuOpen && (
              <div
                id={`${idPrefix}-hero-category-menu`}
                role="group"
                aria-label={t("ui.globalSearchBar.categories")}
                className={`absolute top-full left-0 mt-1.5 w-80 ${DROPDOWN_PANEL_CLASSES}`}
              >
                <div className={DROPDOWN_HEADER_CLASSES}>
                  <div className={DROPDOWN_HEADER_TITLE_CLASSES}>
                    <div className="flex items-center gap-1.5 text-stone-600 normal-case font-semibold">
                      <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{t("ui.globalSearchBar.categories")}</span>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder={t("ui.globalSearchBar.chercherUneCategorie")}
                    value={categoryFilterText}
                    onChange={(e) => setCategoryFilterText(e.target.value)}
                    className={DROPDOWN_SEARCH_INPUT_CLASSES}
                    autoFocus
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleCategorySelect(undefined)}
                  className={`${DROPDOWN_ITEM_CLASSES.base} py-2.5 ${
                    !selectedCategorySlug
                      ? DROPDOWN_ITEM_CLASSES.selected
                      : DROPDOWN_ITEM_CLASSES.unselected
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-stone-500" />
                    <span>{t("ui.globalSearchBar.toutesLesCategories")}</span>
                  </div>
                  {!selectedCategorySlug && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>

                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.slug)}
                    className={`${DROPDOWN_ITEM_CLASSES.base} ${
                      selectedCategorySlug === cat.slug
                        ? DROPDOWN_ITEM_CLASSES.selected
                        : DROPDOWN_ITEM_CLASSES.unselected
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <CategoryIcon category={cat} size="sm" />
                      <div className="truncate">
                        <div className="truncate font-semibold">
                          {getTaxonomyLabel(cat, "compact")}
                        </div>
                        <div className="text-micro text-stone-500 font-normal">
                          {cat.subCategories.length} sous-catégories
                        </div>
                      </div>
                    </div>
                    {selectedCategorySlug === cat.slug && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Keyword Search Query Input */}
        <div
          className={`flex-1 flex items-center gap-2.5 px-3.5 h-control-touch bg-bg-base rounded-control border border-border-base hover:border-border-hover focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-light focus-within:bg-bg-surface ${CONTROL_MOTION_CLASS}`}
        >
          <Search className="w-4 h-4 text-stone-400 shrink-0" />
          <input
            ref={searchInputRef}
            id={`${idPrefix}-hero-query-input`}
            type="search"
            aria-label={t("ui.globalSearchBar.rechercherUneAnnonce")}
            role="combobox"
            aria-expanded={isAutocompleteOpen}
            aria-autocomplete="list"
            aria-controls={`${idPrefix}-autocomplete-dropdown`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
              setIsAutocompleteOpen(true);
            }}
            onFocus={() => setIsAutocompleteOpen(true)}
            onKeyDown={handleInputKeyDown}
            placeholder={resolvedPlaceholder}
            autoFocus={autoFocus}
            className="w-full bg-transparent text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-500 focus:outline-none h-control-touch"
          />
          {query && (
            <button
              type="button"
              onClick={handleClearQuery}
              aria-label={t("ui.globalSearchBar.effacerLaRecherche")}
              className={`p-1 hover:bg-bg-muted rounded-full text-stone-500 hover:text-stone-700 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer shrink-0`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 3. Location & Preferences Selector Trigger */}
        {showLocation && (
          <button
            id={`${idPrefix}-hero-location-button`}
            type="button"
            onClick={openLocationModal}
            aria-label={`Changer de localisation et préférences, actuellement : ${city || userLocation.label} (${activeMarket.name})`}
            className={`flex items-center justify-between md:justify-start gap-2 px-3.5 h-control-touch bg-bg-base hover:bg-bg-subtle active:bg-bg-muted rounded-control text-xs font-semibold text-stone-700 border border-border-base hover:border-border-hover ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer shrink-0 max-w-full md:max-w-[200px]`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">
                {city || userLocation.city || `Toute la ${activeMarket.name}`}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-stone-400 shrink-0 ml-auto" />
          </button>
        )}

        {/* 4. Search Submit Button */}
        <button
          id={`${idPrefix}-hero-submit-button`}
          type="submit"
          aria-label={t("ui.globalSearchBar.lancerLaRechercheDePetites")}
          className={`h-control-touch px-5 rounded-control bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-bold text-xs sm:text-sm shadow-md shadow-primary/20 active:scale-95 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} flex items-center justify-center gap-2 shrink-0 cursor-pointer`}
        >
          <Search className="w-4 h-4 shrink-0" />
          <span>Rechercher</span>
        </button>
      </form>

      {/* Autocomplete Dropdown for Hero */}
      <SearchAutocomplete
        idPrefix={`${idPrefix}-autocomplete`}
        isOpen={isAutocompleteOpen}
        query={query}
        categories={suggestions.categories}
        keywords={suggestions.keywords}
        trending={suggestions.trending}
        recentSearches={recentSearches}
        activeCategorySlug={selectedCategorySlug}
        selectedIndex={selectedIndex}
        onSelect={handleAutocompleteSelect}
        onClearRecentSearch={handleClearRecentSearch}
        onClearAllRecentSearches={handleClearAllRecentSearches}
        onClose={() => setIsAutocompleteOpen(false)}
      />
    </div>
  );
};
