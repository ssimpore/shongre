import { routes } from '../../../configuration/routes';
import { isProSeller } from '../../../domains/user/user.domain';
import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  
  List as 
  X,
  PackageOpen,
  ArrowUpDown,
  
  PlusCircle
} from 'lucide-react';

import { Listing, UserProfile } from '../../../types';
import { taxonomyService, getTaxonomyLabel } from '../../../domains/taxonomy/taxonomy.service';
import { ListingCard } from '../../../design-system/primitives/ListingCard';
import { ListingRail } from '../../../design-system/primitives/ListingRail';
import { Button } from '../../../design-system/primitives/Button';
import { NoResultsFound } from '../../../design-system/primitives/NoResultsFound';
import { usePublishCta } from '../../../security/usePublishCta';
import { DropdownMenu } from '../../../design-system/primitives/DropdownMenu';
import { ViewModeToggle } from '../../../design-system/primitives/ViewModeToggle';
import { useTranslation } from '../../../i18n/I18nProvider';

export interface SellerCatalogProps {
  listings: Listing[];
  seller: UserProfile;
  isOwnProfile?: boolean;
}

type SortOption = 'recent' | 'price_asc' | 'price_desc' | 'popular';

export const SellerCatalog: React.FC<SellerCatalogProps> = ({
  listings,
  seller,
  isOwnProfile = false,
}) => {
  const { t } = useTranslation();
  const publishCta = usePublishCta();
  const isPro = isProSeller(seller);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Active listings only for public view (if viewing own profile, user can see all or just active)
  const activeListings = useMemo(() => {
    return listings.filter((l) => l.status === 'active');
  }, [listings]);

  // Dynamic Category Facets with counts
  const categoryFacets = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    activeListings.forEach((l) => {
      const catSlug = l.categorySlug || 'autres';
      const node = taxonomyService.getNodeBySlug(catSlug);
      const catName = node ? getTaxonomyLabel(node, 'compact') : (l.categoryLabel || 'Autres');
      const existing = map.get(catSlug);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(catSlug, { name: catName, count: 1 });
      }
    });
    return Array.from(map.entries()).map(([slug, data]) => ({
      slug,
      name: data.name,
      count: data.count,
    }));
  }, [activeListings]);

  // Dynamic Subcategory Facets based on selected category
  const subCategoryFacets = useMemo(() => {
    if (selectedCategory === 'all') return [];
    const map = new Map<string, { name: string; count: number }>();
    activeListings
      .filter((l) => l.categorySlug === selectedCategory && l.subCategorySlug)
      .forEach((l) => {
        const subSlug = l.subCategorySlug!;
        const node = taxonomyService.getNodeBySlug(subSlug);
        const subName = node ? getTaxonomyLabel(node, 'compact') : (l.subCategoryLabel || subSlug);
        const existing = map.get(subSlug);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(subSlug, { name: subName, count: 1 });
        }
      });
    return Array.from(map.entries()).map(([slug, data]) => ({
      slug,
      name: data.name,
      count: data.count,
    }));
  }, [activeListings, selectedCategory]);

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    let result = [...activeListings];

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(query) ||
          l.description.toLowerCase().includes(query) ||
          l.city.toLowerCase().includes(query) ||
          (l.attributes?.brand && String(l.attributes.brand).toLowerCase().includes(query))
      );
    }

    // Category
    if (selectedCategory !== 'all') {
      result = result.filter((l) => l.categorySlug === selectedCategory);
    }

    // Subcategory
    if (selectedSubCategory !== 'all') {
      result = result.filter((l) => l.subCategorySlug === selectedSubCategory);
    }

    // Price min
    if (minPrice && !isNaN(Number(minPrice))) {
      result = result.filter((l) => l.price >= Number(minPrice));
    }

    // Price max
    if (maxPrice && !isNaN(Number(maxPrice))) {
      result = result.filter((l) => l.price <= Number(maxPrice));
    }

    // Sorting
    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        result.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
        break;
      case 'recent':
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return result;
  }, [activeListings, searchQuery, selectedCategory, selectedSubCategory, minPrice, maxPrice, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedSubCategory !== 'all' ||
    minPrice !== '' ||
    maxPrice !== '';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSubCategory('all');
    setMinPrice('');
    setMaxPrice('');
  };

  // If seller has 0 active listings overall
  if (activeListings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border-base p-10 sm:p-14 text-center">
        <div className="w-16 h-16 rounded-2xl bg-bg-base border border-border-base text-stone-400 flex items-center justify-center mx-auto mb-4">
          <PackageOpen className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-stone-900 mb-1">
          {isPro ? 'Aucune annonce disponible en vitrine' : 'Aucune annonce en ligne'}
        </h3>
        <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto mb-6">
          {isPro
            ? `${seller.companyName || seller.name} n'a pas d'articles en vente pour le moment. Revenez bientôt découvrir leurs nouveautés.`
            : `${seller.name} n'a aucune annonce active en ce moment.`}
        </p>
        {isOwnProfile ? (
          <Button
            to={publishCta.to}
            variant="primary"
            size="md"
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >{t('profile.sellerCatalog.publierUnePremiereAnnonce')}</Button>
        ) : (
          <Button
            to={routes.search()}
            variant="outline"
            size="md"
          >{t('profile.sellerCatalog.explorerLesAnnoncesDuMarche')}</Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-border-base p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Internal Catalog Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Rechercher parmi les annonces de ${seller.companyName || seller.name}...`}
              aria-label={`Rechercher parmi les annonces de ${seller.companyName || seller.name}`}
              className="w-full pl-9 pr-8 py-2 bg-bg-base border border-border-base rounded-control text-xs sm:text-sm text-stone-900 placeholder:text-stone-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-control-touch"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t('profile.sellerCatalog.effacerLaRecherche')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Filter Toggle, View Toggle, Sort */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Price filter drawer button */}
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                isFilterDrawerOpen || minPrice || maxPrice
                  ? 'bg-bg-base text-primary border-primary'
                  : 'bg-bg-base text-stone-700 border-border-base hover:bg-bg-subtle'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtres prix</span>
              {(minPrice || maxPrice) && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </button>

            {/* Grid / List switch */}
            <ViewModeToggle
              viewMode={viewMode}
              onChange={(mode) => setViewMode(mode as 'grid' | 'list')}
              size="sm"
            />

            {/* Sort Selector at extreme right */}
            <DropdownMenu<SortOption>
              id="seller-catalog-sort"
              ariaLabel="Trier le catalogue"
              size="sm"
              placement="bottom-right"
              panelWidth="w-48"
              mobileIcon={<ArrowUpDown className="w-3.5 h-3.5 text-stone-700" />}
              headerTitle="Trier par"
              options={[
                { value: 'recent', label: 'Plus récentes' },
                { value: 'price_asc', label: 'Prix croissant' },
                { value: 'price_desc', label: 'Prix décroissant' },
                { value: 'popular', label: 'Popularité' },
              ]}
              value={sortBy}
              onChange={(val) => setSortBy(val)}
            />
          </div>
        </div>

        {/* Collapsible Price Filter Tray */}
        {isFilterDrawerOpen && (
          <div className="mt-3 pt-3 border-t border-border-subtle flex flex-wrap items-center gap-3 animate-in fade-in duration-fast">
            <span className="text-xs font-bold text-stone-700">{t('profile.sellerCatalog.fourchetteDePrix')}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min €"
                aria-label={t('profile.sellerCatalog.prixMinimum')}
                min="0"
                className="w-24 px-2.5 py-1.5 bg-bg-base border border-border-base rounded-control text-xs focus:bg-white focus:outline-hidden focus:border-primary h-control-touch"
              />
              <span className="text-stone-500 text-xs">—</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max €"
                aria-label={t('profile.sellerCatalog.prixMaximum')}
                min="0"
                className="w-24 px-2.5 py-1.5 bg-bg-base border border-border-base rounded-control text-xs focus:bg-white focus:outline-hidden focus:border-primary h-control-touch"
              />
            </div>
            {(minPrice || maxPrice) && (
              <button
                type="button"
                onClick={() => {
                  setMinPrice('');
                  setMaxPrice('');
                }}
                className="text-xs text-stone-500 hover:text-primary font-semibold underline"
              >{t('profile.sellerCatalog.effacerLesPrix')}</button>
            )}
          </div>
        )}

        {/* Category Facet Tabs */}
        {categoryFacets.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border-subtle flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedSubCategory('all');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-bg-base text-stone-600 hover:bg-bg-subtle border border-border-base'
              }`}
            >
              Toutes ({activeListings.length})
            </button>
            {categoryFacets.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.slug);
                  setSelectedSubCategory('all');
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === cat.slug
                    ? 'bg-stone-900 text-white'
                    : 'bg-bg-base text-stone-600 hover:bg-bg-subtle border border-border-base'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        )}

        {/* Subcategory Facets */}
        {subCategoryFacets.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider shrink-0 mr-1">{t('profile.sellerCatalog.sousCategories')}</span>
            <button
              type="button"
              onClick={() => setSelectedSubCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                selectedSubCategory === 'all'
                  ? 'bg-primary text-white font-bold'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              Toutes
            </button>
            {subCategoryFacets.map((sub) => (
              <button
                key={sub.slug}
                type="button"
                onClick={() => setSelectedSubCategory(sub.slug)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  selectedSubCategory === sub.slug
                    ? 'bg-primary text-white font-bold'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {sub.name} ({sub.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Filter Chips & Result Count */}
      <div className="flex items-center justify-between text-xs text-stone-500 px-1">
        <div>
          <span className="font-bold text-stone-900">{filteredListings.length}</span> annonce
          {filteredListings.length > 1 ? 's' : ''} trouvée{filteredListings.length > 1 ? 's' : ''}
          {hasActiveFilters && ' avec les filtres sélectionnés'}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-primary font-bold hover:underline"
          >
            <X className="w-3.5 h-3.5" />{t('profile.sellerCatalog.reinitialiserLesFiltres2')}</button>
        )}
      </div>

      {/* Listings Grid or List */}
      {filteredListings.length > 0 ? (
        viewMode === 'grid' ? (
          <ListingRail label={t('profile.sellerCatalog.catalogueDuVendeur')}>
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} variant="grid" />
            ))}
          </ListingRail>
        ) : (
          <div className="space-y-3">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} variant="list" />
            ))}
          </div>
        )
      ) : (
        <NoResultsFound
          id="seller-catalog-no-results"
          query={searchQuery}
          title={t('profile.sellerCatalog.aucunArticleNeCorrespondA')}
          description={t('profile.sellerCatalog.essayezDeModifierVotreMot')}
          onClearFilters={handleResetFilters}
          clearFiltersLabel={t('profile.sellerCatalog.reinitialiserLesFiltres')}
        />
      )}
    </div>
  );
};
