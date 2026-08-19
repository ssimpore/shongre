import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  Grid,
  List as ListIcon,
  Map as MapIcon,
  MapPin,
  Bookmark,
  Sparkles,
  ArrowUpDown,
  Truck,
  ShieldCheck,
  Tag,
  Check,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  Layers,
} from 'lucide-react';
import { listingRepository } from '../../repositories/listing.repository';
import { Listing, SearchFilters, ListingCondition } from '../../types';
import { TAXONOMY, CONDITION_OPTIONS } from '../../domains/taxonomy/taxonomy.data';
import { taxonomyService, getTaxonomyLabel } from '../../domains/taxonomy/taxonomy.service';
import { ListingCard } from '../../design-system/primitives/ListingCard';
import { Button } from '../../design-system/primitives/Button';
import { Input, Checkbox } from '../../design-system/primitives/FormField';
import { Drawer } from '../../design-system/primitives/Modal';
import { plural } from '../../utilities/formatters';
import { Skeleton } from '../../design-system/primitives/UIComponents';
import { NoResultsFound } from '../../design-system/primitives/NoResultsFound';
import { ExploreMapView } from './ExploreMapView';
import { useMarketLocation } from '../../app/providers/MarketLocationProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { storageService } from '../../services/storage.service';
import { CategoryIcon } from '../../design-system/primitives/CategoryIcon';
import { FilterChip } from '../../design-system/primitives/FilterChip';
import { CategoryFilterRail } from '../../design-system/primitives/CategoryFilterRail';
import { SEARCH_PLACEHOLDER } from '../../configuration/search.config';
import { GlobalSearchBar } from '../../design-system/primitives/GlobalSearchBar';
import { DropdownMenu, DropdownOption } from '../../design-system/primitives/DropdownMenu';
import { PriceRangeSlider } from '../../design-system/primitives/PriceRangeSlider';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { location: userLocation, openLocationModal, resetLocation } = useMarketLocation();
  const toast = useToast();

  const urlViewParam = searchParams.get('view') as 'grid' | 'list' | 'map' | null;
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>(
    urlViewParam === 'map' || urlViewParam === 'list' ? urlViewParam : 'grid'
  );
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Extract filter params from URL
  const query = searchParams.get('query') || '';
  const categorySlug = searchParams.get('category') || '';
  const subCategorySlug = searchParams.get('subCategory') || '';
  const cityParam = searchParams.get('city');
  // Only filter by city if the URL specifically specifies an active, non-countrywide city query parameter
  const city = (cityParam && !cityParam.startsWith('Tout') && !cityParam.startsWith('Toute') && cityParam !== 'all') ? cityParam : '';
  const radiusKm = searchParams.get('radius') ? Number(searchParams.get('radius')) : (userLocation.radiusKm || 30);
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const sellerType = (searchParams.get('sellerType') as any) || 'all';
  const delivery = searchParams.get('delivery') === 'true';
  const onlinePayment = searchParams.get('onlinePayment') === 'true';
  const onlyDeals = searchParams.get('onlyDeals') === 'true';
  const sortBy = (searchParams.get('sortBy') as any) || 'date_desc';
  const marketCode = searchParams.get('market') || storageService.getActiveMarketCode() || 'FR';

  // Temporary filter state for mobile drawer / inputs
  const [tempQuery, setTempQuery] = useState(query);

  useEffect(() => {
    setTempQuery(query);
  }, [query]);

  // Execute search query
  useEffect(() => {
    setIsLoading(true);
    const filters: SearchFilters = {
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
      sortBy,
      marketCode,
      page: 1,
      limit: 24,
    };

    listingRepository.getListings(filters).then((res) => {
      setListings(res.listings);
      setTotalCount(res.total);
      setIsLoading(false);
    });

    if (query) {
      storageService.addRecentSearch(query);
    }
  }, [query, categorySlug, subCategorySlug, city, radiusKm, minPrice, maxPrice, sellerType, delivery, onlinePayment, onlyDeals, sortBy, marketCode]);

  const updateFilter = (key: string, value: string | undefined) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === undefined || value === '' || value === 'all') {
        next.delete(key);
        if (key === 'category') {
          next.delete('subCategory');
        }
      } else {
        next.set(key, value);
        if (key === 'category') {
          next.delete('subCategory');
        }
      }
      next.delete('page');
      return next;
    });
  };

  const handlePriceChange = ({ min, max }: { min?: number; max?: number }) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (min !== undefined) next.set('minPrice', String(min));
      else next.delete('minPrice');
      if (max !== undefined) next.set('maxPrice', String(max));
      else next.delete('maxPrice');
      next.delete('page');
      return next;
    });
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
    setTempQuery('');
    resetLocation();
  };

  const handleSaveSearch = () => {
    const title = query ? `Recherche "${query}"` : categorySlug ? `Catégorie ${categorySlug}` : 'Ma recherche personnalisée';
    storageService.saveSearch({
      id: `ss-${Date.now()}`,
      title,
      filters: { query, categorySlug, city, minPrice, maxPrice },
      createdAt: new Date().toISOString(),
      hasNotifications: true,
      matchCount: totalCount,
    });
    toast.success(`La recherche "${title}" a été enregistrée avec alertes activées.`, 'Recherche sauvegardée');
  };

  const activeCategory = TAXONOMY.find((c) => c.slug === categorySlug || c.id === categorySlug);
  const activeSubCat = activeCategory?.subCategories.find((s) => s.slug === subCategorySlug || s.id === subCategorySlug);
  const activeNodeId = activeSubCat?.id || activeCategory?.id;

  const dynamicFacets = useMemo(() => {
    return taxonomyService.resolveSearchFilters(activeNodeId);
  }, [activeNodeId]);

  const categoryDropdownOptions: DropdownOption[] = useMemo(() => [
    {
      value: '',
      label: 'Toutes les catégories',
      icon: <Layers className="w-3.5 h-3.5 text-stone-500" />,
    },
    ...TAXONOMY.map((cat) => ({
      value: cat.slug,
      label: getTaxonomyLabel(cat, 'compact'),
      icon: <CategoryIcon category={cat} size="xs" />,
      sublabel: `${cat.subCategories.length} sous-catégories`,
    })),
  ], []);

  const subcategoryDropdownOptions: DropdownOption[] = useMemo(() => {
    const activeNode = categorySlug ? taxonomyService.getNodeBySlug(categorySlug) : undefined;
    const children = activeNode ? taxonomyService.getChildren(activeNode.id) : [];
    if (children.length === 0) return [];
    return [
      { value: '', label: 'Toutes les sous-catégories' },
      ...children.map((sub) => ({
        value: sub.slug,
        label: getTaxonomyLabel(sub, 'compact'),
      })),
    ];
  }, [categorySlug]);

  const sortDropdownOptions: DropdownOption[] = [
    { value: 'date_desc', label: 'Plus récentes' },
    { value: 'price_asc', label: 'Prix : croissant' },
    { value: 'price_desc', label: 'Prix : décroissant' },
    { value: 'relevance', label: 'Pertinence' },
  ];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categorySlug) count++;
    if (subCategorySlug) count++;
    if (city) count++;
    if (minPrice || maxPrice) count++;
    if (sellerType && sellerType !== 'all') count++;
    if (delivery) count++;
    if (onlyDeals) count++;
    if (onlinePayment) count++;
    for (const key of searchParams.keys()) {
      if (key.startsWith('attr_')) count++;
    }
    return count;
  }, [categorySlug, subCategorySlug, city, minPrice, maxPrice, sellerType, delivery, onlyDeals, onlinePayment, searchParams]);

  /**
   * The h1 describes what the user is actually looking at: their query, the
   * category they drilled into, or the unfiltered catalogue.
   */
  const pageHeading = useMemo(() => {
    if (query) return `Recherche : ${query}`;
    if (activeSubCat) return activeSubCat.name;
    if (activeCategory) return activeCategory.name;
    return 'Toutes les annonces';
  }, [query, activeSubCat, activeCategory]);

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
            ? 'Recherche en cours…'
            : `${plural(totalCount, 'annonce')} ${
                totalCount > 1 ? 'correspondent' : 'correspond'
              } à votre recherche`}
        </p>
      </div>

      {/* Top Search bar on Search Page */}
      <div className="bg-white p-3 sm:p-5 rounded-3xl border border-stone-200/60 shadow-sm mb-4 sm:mb-6">
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
          onSearch={({ query: newQ, categorySlug: newCat, subCategorySlug: newSub, city: newCity, radiusKm: newRad }) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              if (newQ) next.set('query', newQ);
              else next.delete('query');
              if (newCat) next.set('category', newCat);
              else next.delete('category');
              if (newSub) next.set('subCategory', newSub);
              else next.delete('subCategory');
              if (newCity) next.set('city', newCity);
              else next.delete('city');
              if (newRad && newRad > 0) next.set('radius', String(newRad));
              else next.delete('radius');
              next.delete('page');
              return next;
            });
          }}
        />

        {/* Active Filters Badges */}
        {(query || categorySlug || city || minPrice || maxPrice || sellerType !== 'all' || delivery || onlyDeals) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-border-subtle mt-3">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1">
              Filtres actifs :
            </span>

            {query && (
              <FilterChip tone="query" label={query} onRemove={() => updateFilter('query', undefined)}>
                "{query}"
              </FilterChip>
            )}

            {activeCategory && (
              <FilterChip
                label={activeCategory.name}
                onRemove={() => updateFilter('category', undefined)}
              >
                {getTaxonomyLabel(activeCategory, 'compact')}
              </FilterChip>
            )}

            {activeSubCat && (
              <FilterChip
                label={activeSubCat.name}
                onRemove={() => updateFilter('subCategory', undefined)}
              >
                {getTaxonomyLabel(activeSubCat, 'compact')}
              </FilterChip>
            )}

            {sellerType === 'pro' && (
              <FilterChip tone="strong" onRemove={() => updateFilter('sellerType', undefined)}>
                Professionnels
              </FilterChip>
            )}

            {sellerType === 'individual' && (
              <FilterChip onRemove={() => updateFilter('sellerType', undefined)}>
                Particuliers
              </FilterChip>
            )}

            {delivery && (
              <FilterChip tone="success" onRemove={() => updateFilter('delivery', undefined)}>
                Livraison disponible
              </FilterChip>
            )}

            {onlyDeals && (
              <FilterChip tone="warning" onRemove={() => updateFilter('onlyDeals', undefined)}>
                Bons plans
              </FilterChip>
            )}

            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-stone-500 hover:text-danger font-semibold underline ml-2 cursor-pointer"
            >
              Effacer tout
            </button>
          </div>
        )}
      </div>

      {/* Horizontal Scrollable Category Filter Chips Rail */}
      <div className="mb-6">
        <CategoryFilterRail
          selectedCategorySlug={categorySlug || undefined}
          onSelectAll={clearAllFilters}
          onSelectCategory={(slug) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              if (slug) {
                next.set('category', slug);
              } else {
                next.delete('category');
              }
              next.delete('subCategory');
              if (!slug) {
                for (const key of Array.from(next.keys())) {
                  if (key.startsWith('attr_')) {
                    next.delete(key);
                  }
                }
              }
              next.delete('page');
              return next;
            });
          }}
          selectedSubCategorySlug={subCategorySlug || undefined}
          onSelectSubCategory={(subSlug) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              if (subSlug) {
                next.set('subCategory', subSlug);
              } else {
                next.delete('subCategory');
              }
              next.delete('page');
              return next;
            });
          }}
          showAllOption={true}
          showSubCategories={true}
          idPrefix="search-category-rail"
        />
      </div>

      {/* Main Content Layout: Sidebar + Grid */}
      <div className={showDesktopFilters ? "grid grid-cols-1 lg:grid-cols-4 gap-6" : "w-full space-y-4"}>
        
        {/* Desktop Sidebar Filters */}
        {showDesktopFilters && (
          <aside className="hidden lg:block lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-stone-200/60 p-6 space-y-6 shadow-sm">
              
              {/* Header with collapse button */}
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                  Filtres
                </span>
                <button
                  type="button"
                  onClick={() => setShowDesktopFilters(false)}
                  className="text-xs font-semibold text-stone-500 hover:text-stone-700 flex items-center gap-1 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-stone-100"
                  title="Masquer le panneau de filtres"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                  <span>Masquer</span>
                </button>
              </div>

              {/* Categories */}
              <div>
                <label
                  htmlFor="desktop-category-select"
                  className="text-xs font-bold text-stone-900 uppercase tracking-wider block mb-2"
                >
                  Catégories
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
                        <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Catégories</span>
                      </div>
                    }
                    options={categoryDropdownOptions}
                    value={categorySlug || ''}
                    onChange={(val) => {
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        if (val) {
                          next.set('category', val);
                        } else {
                          next.delete('category');
                        }
                        next.delete('subCategory');
                        next.delete('page');
                        return next;
                      });
                    }}
                  />

                  {/* Subcategory dropdown when category with children is active */}
                  {subcategoryDropdownOptions.length > 0 && (
                    <div className="pt-1">
                      <label
                        htmlFor="desktop-subcategory-select"
                        className="text-[11px] font-semibold text-stone-600 block mb-1.5"
                      >
                        Sous-catégorie
                      </label>
                      <DropdownMenu
                        id="desktop-subcategory-select"
                        ariaLabel="Filtrer par sous-catégorie"
                        fullWidth
                        searchable={subcategoryDropdownOptions.length > 5}
                        searchPlaceholder="Rechercher une sous-catégorie…"
                        headerTitle={
                          <div className="flex items-center gap-1.5 text-stone-600 normal-case font-semibold">
                            <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>Sous-catégories</span>
                          </div>
                        }
                        options={subcategoryDropdownOptions}
                        value={subCategorySlug || ''}
                        onChange={(val) => {
                          setSearchParams((prev) => {
                            const next = new URLSearchParams(prev);
                            if (val) {
                              next.set('subCategory', val);
                            } else {
                              next.delete('subCategory');
                            }
                            next.delete('page');
                            return next;
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Seller Type */}
              <div className="pt-4 border-t border-border-subtle">
                <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3">
                  Type de vendeur
                </h2>
                <div className="space-y-2">
                  {[
                    { value: 'all', label: 'Tous les vendeurs' },
                    { value: 'individual', label: 'Particuliers uniquement' },
                    { value: 'pro', label: 'Professionnels (Boutiques)' },
                  ].map((s) => (
                    <label key={s.value} className="flex items-center gap-2 min-h-6 text-xs font-medium text-stone-700 cursor-pointer">
                      <input
                        type="radio"
                        name="sellerType"
                        checked={sellerType === s.value}
                        onChange={() => updateFilter('sellerType', s.value)}
                        className="text-primary focus:ring-primary"
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range. The slider commits on release, so the separate
                  "Appliquer le prix" button that the two number fields needed
                  as a commit point is gone with them. */}
              <div className="pt-4 border-t border-border-subtle">
                <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3">
                  Prix (€)
                </h2>
                <PriceRangeSlider min={minPrice} max={maxPrice} onChange={handlePriceChange} />
              </div>

              {/* Delivery & Payment Toggles */}
              <div className="pt-4 border-t border-border-subtle space-y-2.5">
                <Checkbox
                  label="Livraison disponible"
                  description="Mondial Relay, Colissimo"
                  checked={delivery}
                  onChange={(e) => updateFilter('delivery', e.target.checked ? 'true' : undefined)}
                />
                <Checkbox
                  label="Paiement sécurisé en ligne"
                  checked={onlinePayment}
                  onChange={(e) => updateFilter('onlinePayment', e.target.checked ? 'true' : undefined)}
                />
                <Checkbox
                  label="Bons plans uniquement"
                  checked={onlyDeals}
                  onChange={(e) => updateFilter('onlyDeals', e.target.checked ? 'true' : undefined)}
                />
              </div>

              {/* Dynamic Category Specific Facets */}
              {dynamicFacets.length > 0 && (
                <div className="pt-4 border-t border-border-subtle space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Filtres spécifiques
                    </h2>
                    <span className="text-micro bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">
                      {dynamicFacets.length}
                    </span>
                  </div>

                  {dynamicFacets.map((facet) => {
                    const attr = facet.attribute;
                    const currentValue = searchParams.get(`attr_${attr.code}`) || '';

                    if (facet.facetType === 'select' && attr.options) {
                      const facetOptions: DropdownOption[] = [
                        { value: '', label: 'Tous / Toutes' },
                        ...attr.options.map((opt) => ({
                          value: opt.value,
                          label: opt.label,
                        })),
                      ];

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
                            onChange={(val) => updateFilter(`attr_${attr.code}`, val || undefined)}
                          />
                        </div>
                      );
                    }

                    if (facet.facetType === 'range') {
                      return (
                        <div key={attr.id} className="space-y-1">
                          <label className="text-xs font-semibold text-stone-700 block">
                            {attr.label} {attr.unit ? `(${attr.unit})` : ''}
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Input
                              type="number"
                              placeholder="Min"
                    aria-label="Prix minimum en euros"
                              value={searchParams.get(`attr_${attr.code}_min`) || ''}
                              onChange={(e) => updateFilter(`attr_${attr.code}_min`, e.target.value || undefined)}
                              className="h-8 text-xs"
                            />
                            <Input
                              type="number"
                              placeholder="Max"
                    aria-label="Prix maximum en euros"
                              value={searchParams.get(`attr_${attr.code}_max`) || ''}
                              onChange={(e) => updateFilter(`attr_${attr.code}_max`, e.target.value || undefined)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}

            </div>
          </aside>
        )}

        {/* Results Column */}
        <div className={showDesktopFilters ? "lg:col-span-3 space-y-4" : "w-full space-y-4"}>
          
          {/* Controls Bar: Total Count, Save Search, View Mode, Sort */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200/60 shadow-xs flex items-center justify-between gap-x-3 gap-y-2 flex-wrap lg:flex-nowrap mb-4">
            <div className="flex items-center gap-3 min-w-0 shrink">
              <span className="text-sm font-bold text-stone-900 shrink-0">
                {plural(totalCount, 'annonce')}
              </span>

              {/* Desktop Toggle Filter Panel Button */}
              <button
                type="button"
                onClick={() => setShowDesktopFilters(!showDesktopFilters)}
                className={`hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  showDesktopFilters
                    ? 'bg-bg-base border-border-base text-stone-700 hover:bg-bg-subtle'
                    : 'bg-primary-light border-primary-border text-primary hover:bg-primary-light/80'
                }`}
                title={showDesktopFilters ? "Masquer les filtres" : "Afficher les filtres"}
              >
                {showDesktopFilters ? (
                  <>
                    <PanelLeftClose className="w-3.5 h-3.5 text-stone-500" />
                    <span>Masquer</span>
                  </>
                ) : (
                  <>
                    <PanelLeft className="w-3.5 h-3.5 text-primary" />
                    <span>Afficher</span>
                  </>
                )}
              </button>

              {/* Save Search Button */}
              <button
                type="button"
                onClick={handleSaveSearch}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-border-base bg-bg-base text-stone-700 hover:bg-bg-subtle hover:text-primary transition-colors cursor-pointer"
                title="Sauvegarder cette recherche"
              >
                <Bookmark className="w-3.5 h-3.5 text-stone-500" />
                <span>Sauvegarder</span>
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
                className={`lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  activeFilterCount > 0
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-bg-base text-stone-800 border border-border-base hover:bg-bg-subtle'
                }`}
                aria-label={`Ouvrir les filtres de recherche (${activeFilterCount} actifs)`}
              >
                <SlidersHorizontal className={`w-3.5 h-3.5 ${activeFilterCount > 0 ? 'text-white' : 'text-primary'}`} />
                <span>Filtres</span>
                {activeFilterCount > 0 && (
                  <span className="min-w-4 h-4 px-1 rounded-full bg-white text-primary text-micro font-black flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Sort selector */}
              <div className="flex items-center gap-1.5 text-xs min-w-0 flex-1 lg:flex-none">
                <span className="text-stone-500 hidden sm:inline shrink-0 font-medium">Trier par :</span>
                <DropdownMenu
                  id="sort-select"
                  ariaLabel="Trier les résultats"
                  size="sm"
                  placement="bottom-right"
                  panelWidth="w-48"
                  className="flex-1 lg:flex-none min-w-0"
                  triggerClassName="w-full lg:w-auto"
                  headerTitle={
                    <div className="flex items-center gap-1.5 text-stone-600 normal-case font-semibold">
                      <ArrowUpDown className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Trier par</span>
                    </div>
                  }
                  options={sortDropdownOptions}
                  value={sortBy}
                  onChange={(val) => updateFilter('sortBy', val)}
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-stone-100/90 border border-border-base rounded-lg p-0.5 shadow-xs shrink-0">
                <button
                  type="button"
                  aria-label="Affichage grille"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                    viewMode === 'grid'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Grille</span>
                </button>
                <button
                  type="button"
                  aria-label="Affichage liste"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                    viewMode === 'list'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  <ListIcon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Liste</span>
                </button>
                <button
                  type="button"
                  aria-label="Affichage carte"
                  onClick={() => setViewMode('map')}
                  className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                    viewMode === 'map'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Carte</span>
                </button>
              </div>
            </div>
          </div>

          {/* Results Display (Grid / List / Map) */}
          {isLoading ? (
            <div
              className={
                showDesktopFilters
                  ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4'
              }
            >
              {[...Array(showDesktopFilters ? 6 : 10)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : listings.length > 0 ? (
            viewMode === 'map' ? (
              <ExploreMapView
                listings={listings}
                selectedCity={city || undefined}
                onSelectCity={(selected) => updateFilter('city', selected)}
              />
            ) : (
              <div
                className={
                  viewMode === 'grid'
                    ? showDesktopFilters
                      ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4'
                      : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4'
                    : 'flex flex-col gap-3'
                }
              >
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} variant={viewMode} />
                ))}
              </div>
            )
          ) : (
            <NoResultsFound
              id="search-no-results"
              query={query}
              onClearFilters={clearAllFilters}
              clearFiltersLabel="Effacer tous les filtres"
              onSaveSearch={handleSaveSearch}
              saveSearchLabel="Sauvegarder cette recherche"
            />
          )}

        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <Drawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Filtres de recherche"
      >
        <div className="space-y-6">
          {/* Category */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              Catégorie
            </label>
            <DropdownMenu
              id="mobile-category-select"
              ariaLabel="Filtrer par catégorie"
              fullWidth
              searchable
              searchPlaceholder="Rechercher une catégorie…"
              headerTitle={
                <div className="flex items-center gap-1.5 text-stone-600 normal-case font-semibold">
                  <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Catégories</span>
                </div>
              }
              options={categoryDropdownOptions}
              value={categorySlug || ''}
              onChange={(val) => updateFilter('category', val || undefined)}
            />

            {/* Subcategory dropdown if active category has children */}
            {subcategoryDropdownOptions.length > 0 && (
              <div className="pt-3">
                <label className="text-[11px] font-semibold text-stone-600 block mb-1.5">
                  Sous-catégorie
                </label>
                <DropdownMenu
                  id="mobile-subcategory-select"
                  ariaLabel="Filtrer par sous-catégorie"
                  fullWidth
                  searchable={subcategoryDropdownOptions.length > 5}
                  searchPlaceholder="Rechercher une sous-catégorie…"
                  headerTitle={
                    <div className="flex items-center gap-1.5 text-stone-600 normal-case font-semibold">
                      <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Sous-catégories</span>
                    </div>
                  }
                  options={subcategoryDropdownOptions}
                  value={subCategorySlug || ''}
                  onChange={(val) => updateFilter('subCategory', val || undefined)}
                />
              </div>
            )}
          </div>

          {/* Seller type */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              Type de vendeur
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { value: 'all', label: 'Tous' },
                { value: 'individual', label: 'Particuliers' },
                { value: 'pro', label: 'Pros' },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => updateFilter('sellerType', s.value)}
                  className={`py-2.5 text-xs font-bold rounded-xl border text-center transition-colors cursor-pointer ${
                    sellerType === s.value
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-white text-stone-700 border-border-base hover:bg-stone-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div>
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              Budget (€)
            </span>
            <PriceRangeSlider min={minPrice} max={maxPrice} onChange={handlePriceChange} />
          </div>

          {/* Delivery & Security Checkboxes */}
          <div className="pt-2 border-t border-border-subtle space-y-2.5">
            <Checkbox
              label="Livraison disponible"
              description="Mondial Relay, Colissimo, transporteur"
              checked={delivery}
              onChange={(e) => updateFilter('delivery', e.target.checked ? 'true' : undefined)}
            />
            <Checkbox
              label="Paiement sécurisé en ligne"
              checked={onlinePayment}
              onChange={(e) => updateFilter('onlinePayment', e.target.checked ? 'true' : undefined)}
            />
            <Checkbox
              label="Bons plans uniquement"
              checked={onlyDeals}
              onChange={(e) => updateFilter('onlyDeals', e.target.checked ? 'true' : undefined)}
            />
          </div>

          {/* Dynamic Facets in Drawer */}
          {dynamicFacets.length > 0 && (
            <div className="pt-2 border-t border-border-subtle space-y-3">
              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider block">
                Critères spécifiques
              </span>
              {dynamicFacets.map((facet) => {
                const attr = facet.attribute;
                const currentValue = searchParams.get(`attr_${attr.code}`) || '';

                if (facet.facetType === 'select' && attr.options) {
                  const facetOptions: DropdownOption[] = [
                    { value: '', label: 'Tous / Toutes' },
                    ...attr.options.map((opt) => ({
                      value: opt.value,
                      label: opt.label,
                    })),
                  ];

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
                        onChange={(val) => updateFilter(`attr_${attr.code}`, val || undefined)}
                      />
                    </div>
                  );
                }

                if (facet.facetType === 'range') {
                  return (
                    <div key={attr.id} className="space-y-1">
                      <label className="text-xs font-semibold text-stone-700 block">
                        {attr.label} {attr.unit ? `(${attr.unit})` : ''}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                    aria-label="Prix minimum en euros"
                          value={searchParams.get(`attr_${attr.code}_min`) || ''}
                          onChange={(e) => updateFilter(`attr_${attr.code}_min`, e.target.value || undefined)}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                    aria-label="Prix maximum en euros"
                          value={searchParams.get(`attr_${attr.code}_max`) || ''}
                          onChange={(e) => updateFilter(`attr_${attr.code}_max`, e.target.value || undefined)}
                        />
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t border-border-subtle sticky bottom-0 bg-white pb-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                clearAllFilters();
                setIsFilterDrawerOpen(false);
              }}
            >
              Effacer tout
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={() => setIsFilterDrawerOpen(false)}
            >
              Voir les résultats ({totalCount})
            </Button>
          </div>
        </div>
      </Drawer>

    </div>
  );
};
