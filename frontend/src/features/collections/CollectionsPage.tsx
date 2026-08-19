import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ChevronRight,
  Filter,
  Layers,
  ArrowLeft,
  Search,
  SlidersHorizontal,
  Home,
  Tag,
  TrendingUp,
  Shirt,
  Bike,
  MapPin,
  Heart,
  Grid,
  Sparkle,
  CheckCircle2,
} from 'lucide-react';
import { collectionService } from '../../domains/collection/collection.service';
import { Collection, CollectionPillarId } from '../../domains/collection/collection.types';
import { listingRepository } from '../../repositories/listing.repository';
import { Listing } from '../../types';
import { ListingCard } from '../../design-system/primitives/ListingCard';
import { Skeleton } from '../../design-system/primitives/UIComponents';
import { Image } from '../../design-system/primitives/Image';
import { IMAGE_SIZES } from '../../design-system/primitives/responsiveImage';
import { ScrollRail } from '../../design-system/primitives/ScrollRail';

const BADGE_STYLES: Record<string, string> = {
  terracotta: 'bg-primary-light text-primary border-primary-border',
  emerald: 'bg-success-surface text-success border-success-border',
  sky: 'bg-info-surface text-info border-info-border',
  amber: 'bg-warning-surface text-warning border-warning-border',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  rose: 'bg-danger-surface text-danger border-danger-border',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  success: 'bg-success-surface text-success border-success-border',
  info: 'bg-info-surface text-info border-info-border',
  warning: 'bg-warning-surface text-warning border-warning-border',
  danger: 'bg-danger-surface text-danger border-danger-border',
};

const PILLAR_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Sparkles,
  TrendingUp,
  Tag,
  Shirt,
  Home,
  Bike,
  MapPin,
  Heart,
};

export const CollectionsPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const selectedCollection: Collection | undefined = useMemo(() => {
    return slug ? collectionService.getCollection(slug) : undefined;
  }, [slug]);

  const [activePillar, setActivePillar] = useState<CollectionPillarId>('all');
  const [collectionSearch, setCollectionSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inCollectionSearch, setInCollectionSearch] = useState('');

  const pillars = useMemo(() => collectionService.getPillars(), []);

  // Fetch base listings
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    listingRepository
      .getListings({ limit: 60, sortBy: 'date_desc' })
      .then((res) => {
        if (!isMounted) return;
        const fetched = res.listings || [];
        setAllListings(fetched);

        if (selectedCollection) {
          const matched = collectionService.filterListingsForCollection(selectedCollection, fetched, {
            allowFallback: true,
          });
          setListings(matched);
        } else {
          setListings(fetched.slice(0, 12));
        }
      })
      .catch(() => {
        if (isMounted) {
          setAllListings([]);
          setListings([]);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCollection]);

  // Collections filtered by active pillar tab and keyword search
  const visibleCollections = useMemo(() => {
    let list = collectionService.getCollections(activePillar);
    if (collectionSearch.trim()) {
      const q = collectionSearch.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.subtitle.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activePillar, collectionSearch]);

  // Filter listings within single collection
  const displayedListings = useMemo(() => {
    let res = listings;
    if (activeTag) {
      const tagLower = activeTag.toLowerCase();
      res = res.filter(
        (l) =>
          l.title.toLowerCase().includes(tagLower) ||
          l.description?.toLowerCase().includes(tagLower) ||
          l.categoryLabel?.toLowerCase().includes(tagLower)
      );
    }
    if (inCollectionSearch.trim()) {
      const q = inCollectionSearch.toLowerCase().trim();
      res = res.filter(
        (l) => l.title.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q)
      );
    }
    return res;
  }, [listings, activeTag, inCollectionSearch]);

  return (
    <div className="min-h-screen bg-bg-base pb-20">
      {/* 1. Breadcrumbs */}
      <div className="border-b border-border-base bg-bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-xs text-stone-500">
            <Link to="/" className="hover:text-stone-900 transition-colors flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              <span>Accueil</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <Link
              to="/collections"
              className={selectedCollection ? 'hover:text-stone-900 transition-colors' : 'font-bold text-stone-900'}
            >
              Collections
            </Link>
            {selectedCollection && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                <span className="font-bold text-stone-900 truncate max-w-xs">{selectedCollection.title}</span>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* 2. Header / Hero Section */}
      {selectedCollection ? (
        <section className="relative bg-gradient-to-b from-stone-900 to-stone-950 text-white pt-8 pb-12 sm:py-14 overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#C4431F_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Title, description, curator note */}
              <div className="lg:col-span-7 space-y-4">
                <Link
                  to="/collections"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-300 hover:text-white transition-colors mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Toutes les collections</span>
                </Link>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${
                      BADGE_STYLES[selectedCollection.badge.variant] || BADGE_STYLES.terracotta
                    }`}
                  >
                    {selectedCollection.badge.label}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-800 text-stone-300 text-xs font-medium border border-stone-700">
                    <Layers className="w-3 h-3 text-stone-400" />
                    {selectedCollection.itemCountLabel}
                  </span>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  {selectedCollection.title}
                </h1>

                <p className="text-sm sm:text-base text-stone-300 max-w-xl leading-relaxed">
                  {selectedCollection.description}
                </p>

                {/* Curator note */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-start gap-3 max-w-xl">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs text-stone-300 space-y-0.5">
                    <p className="font-bold text-white">Le mot de la rédaction</p>
                    <p>{selectedCollection.curatorNote}</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Hero Cover Photo */}
              <div className="lg:col-span-5">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 aspect-4/3 max-w-md mx-auto lg:max-w-none">
                  <Image
                    src={selectedCollection.coverImageUrl}
                    alt={selectedCollection.title}
                    sizes={IMAGE_SIZES.card}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative bg-[#FAF8F5] pt-8 pb-10 sm:py-14 border-b border-border-base">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-3xl space-y-3">
                <h1 className="font-display text-3xl sm:text-5xl font-bold text-stone-900 tracking-tight leading-tight">
                  Toutes nos collections
                </h1>

                <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-normal max-w-2xl">
                  Découvrez des univers thématiques pensés pour vous inspirer : bons plans, mobilier vintage,
                  tech reconditionnée, mobilité douce, rentrée et créateurs de nos régions.
                </p>
              </div>

              {/* Search collections bar */}
              <div className="relative w-full sm:w-80 shrink-0">
                <Search className="w-4.5 h-4.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={collectionSearch}
                  onChange={(e) => setCollectionSearch(e.target.value)}
                  placeholder="Chercher une thématique..."
                  className="w-full h-11 pl-10 pr-4 text-xs sm:text-sm rounded-2xl bg-white border border-stone-200 shadow-2xs focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-10 space-y-10">
        {/* ========================================================= */}
        {/* A. OVERVIEW MODE: Browse All Collections with Pillar Tabs */}
        {/* ========================================================= */}
        {!selectedCollection && (
          <div className="space-y-8">
            {/* Pillar Navigation Tabs */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-2 shadow-2xs">
              <ScrollRail label="piliers" className="-mx-2 px-2 sm:mx-0 sm:px-0">
                <div className="flex gap-2 min-w-max">
                  {pillars.map((pillar) => {
                    const isSelected = activePillar === pillar.id;
                    const IconComponent = PILLAR_ICONS[pillar.iconName] || Sparkles;

                    return (
                      <button
                        key={pillar.id}
                        type="button"
                        onClick={() => setActivePillar(pillar.id)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-stone-900 text-white shadow-xs'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 hover:text-stone-900'
                        }`}
                      >
                        <IconComponent className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-stone-400'}`} />
                        <span>{pillar.label}</span>
                      </button>
                    );
                  })}
                </div>
              </ScrollRail>
            </div>

            {/* Active Pillar Description */}
            <div className="flex items-center justify-between gap-4 text-xs text-stone-500 font-medium px-1">
              <span>
                {pillars.find((p) => p.id === activePillar)?.description || ''}
              </span>
              <span className="font-bold text-stone-700 shrink-0">
                {visibleCollections.length} collection{visibleCollections.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Collections Grid */}
            {visibleCollections.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                {visibleCollections.map((col) => (
                  <Link
                    key={col.id}
                    to={`/collections/${col.slug}`}
                    className="group relative flex flex-col justify-between bg-white rounded-3xl border border-stone-200/90 hover:border-stone-300 shadow-sm hover:shadow-xl transition-all duration-normal overflow-hidden active:scale-[0.99]"
                  >
                    {/* Media Well */}
                    <div className="relative w-full h-52 overflow-hidden bg-stone-100 shrink-0">
                      <Image
                        src={col.coverImageUrl}
                        alt={col.title}
                        sizes={IMAGE_SIZES.card}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow ease-out-soft"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />

                      <div className="absolute top-3 left-3 z-10">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border shadow-xs backdrop-blur-xs ${
                            BADGE_STYLES[col.badge.variant] || BADGE_STYLES.terracotta
                          }`}
                        >
                          {col.badge.label}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 z-10">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-white text-xs font-semibold">
                          <Layers className="w-3.5 h-3.5 text-stone-300" />
                          {col.itemCountLabel}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h2 className="text-lg font-bold text-stone-900 group-hover:text-primary transition-colors leading-snug">
                          {col.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-stone-500 line-clamp-2 leading-relaxed">
                          {col.subtitle}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {col.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs font-medium text-stone-600 bg-stone-100 group-hover:bg-stone-200/80 px-2 py-0.5 rounded-md transition-colors"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="w-8 h-8 rounded-full bg-stone-100 group-hover:bg-primary group-hover:text-white text-stone-600 flex items-center justify-center transition-colors shrink-0">
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-stone-900">Aucune collection trouvée</h3>
                <p className="text-xs text-stone-500">
                  Aucune collection ne correspond à votre recherche "{collectionSearch}".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCollectionSearch('');
                    setActivePillar('all');
                  }}
                  className="h-9 px-4 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors"
                >
                  Voir toutes les collections
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* B. SINGLE COLLECTION DETAIL: Filterable Inventory Showcase */}
        {/* ========================================================= */}
        {selectedCollection && (
          <div className="space-y-6">
            {/* Filter Bar with sub-tags & local search */}
            <div className="bg-white rounded-2xl border border-border-base p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveTag(null)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTag === null
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    Tout ({listings.length})
                  </button>
                  {selectedCollection.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        activeTag === tag
                          ? 'bg-primary text-white font-bold shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* In-collection search input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={inCollectionSearch}
                    onChange={(e) => setInCollectionSearch(e.target.value)}
                    placeholder="Filtrer dans la sélection..."
                    className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Listings Grid */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="text-base sm:text-lg font-bold text-stone-900">
                  {activeTag ? `Sélection filtrée par "${activeTag}"` : 'Pièces sélectionnées'}
                  <span className="text-xs text-stone-400 font-normal ml-2">
                    ({displayedListings.length} annonce{displayedListings.length > 1 ? 's' : ''})
                  </span>
                </h3>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-3 border border-border-base space-y-3">
                      <Skeleton className="h-44 w-full rounded-xl" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-5 w-1/3" />
                    </div>
                  ))}
                </div>
              ) : displayedListings.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {displayedListings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                    <Filter className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-stone-900">Aucune annonce trouvée</h4>
                    <p className="text-xs text-stone-500">
                      Aucune annonce ne correspond aux filtres actifs dans cette collection.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTag(null);
                      setInCollectionSearch('');
                    }}
                    className="h-9 px-4 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              )}
            </div>

            {/* Other Collections Rail */}
            <div className="pt-10 border-t border-border-base space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-stone-900">Découvrir d’autres collections</h3>
                <Link to="/collections" className="text-xs font-bold text-primary hover:underline">
                  Voir tout ({collectionService.getCollections('all').length})
                </Link>
              </div>

              <ScrollRail label="autres collections" className="-mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex gap-4">
                  {collectionService
                    .getCollections('all')
                    .filter((c) => c.id !== selectedCollection.id)
                    .slice(0, 6)
                    .map((c) => (
                      <Link
                        key={c.id}
                        to={`/collections/${c.slug}`}
                        className="group flex items-center gap-3.5 p-3 rounded-2xl bg-white border border-stone-200 hover:border-stone-300 w-72 shrink-0 shadow-2xs hover:shadow-md transition-all"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-stone-100">
                          <Image
                            src={c.coverImageUrl}
                            alt={c.title}
                            sizes={IMAGE_SIZES.compact}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold text-primary uppercase block truncate">
                            {c.badge.label}
                          </span>
                          <h4 className="text-xs font-bold text-stone-900 truncate group-hover:text-primary transition-colors">
                            {c.title}
                          </h4>
                          <p className="text-[11px] text-stone-400 mt-0.5">{c.itemCountLabel}</p>
                        </div>
                      </Link>
                    ))}
                </div>
              </ScrollRail>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
