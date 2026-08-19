import { routes } from '../../configuration/routes';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle,
  Truck,
  Building2,
  Tag,
  Car,
  Home as HomeIcon,
  Smartphone,
  Shirt,
  Bike,
  Armchair,
  Gamepad2,
  Gift,
  Lamp,
  ScanSearch,
  Sparkle,
  Wrench,
  Briefcase,
  Layers,
  ChevronRight,
  PlusCircle,
  X,
  ChevronDown,
} from 'lucide-react';
import { TAXONOMY } from '../../domains/taxonomy/taxonomy.data';
import { getTaxonomyLabel } from '../../domains/taxonomy/taxonomy.service';
import { listingRepository } from '../../repositories/listing.repository';
import { userRepository } from '../../repositories/user.repository';
import { Listing, UserProfile } from '../../types';
import { ListingCard } from '../../design-system/primitives/ListingCard';
import { SellerCard } from '../../design-system/primitives/SellerCard';
import { Button } from '../../design-system/primitives/Button';
import { Skeleton } from '../../design-system/primitives/UIComponents';
import { useMarketLocation } from '../../app/providers/MarketLocationProvider';
import { HeroBoostedScroll } from './components/HeroBoostedScroll';
import { HomeTrustStrip } from './components/HomeTrustStrip';
import { HomeCollectionsSection } from './components/HomeCollectionsSection';
import { HomeCategoryExplorer } from './components/HomeCategoryExplorer';
import { CategoryIcon } from '../../design-system/primitives/CategoryIcon';
import { ScrollRail } from '../../design-system/primitives/ScrollRail';
import { usePublishCta } from '../../security/usePublishCta';
import { ViewModeToggle, ListingViewMode } from '../../design-system/primitives/ViewModeToggle';
import { plural } from '../../utilities/formatters';

/**
 * Hero quick-search chips. Each carries a glyph so the row reads as a set of
 * things rather than a wall of words — the terms span vehicles, electronics,
 * furniture and giveaways, and the icon is what tells them apart at a glance.
 */
const POPULAR_SEARCHES = [
  { term: 'Vélo gravel', Icon: Bike },
  { term: 'iPhone 15 Pro', Icon: Smartphone },
  { term: 'Peugeot 208', Icon: Car },
  { term: 'Fauteuil vintage', Icon: Armchair },
  { term: 'PS5', Icon: Gamepad2 },
  { term: 'Sézane', Icon: Shirt },
  { term: 'Table teck', Icon: Lamp },
  { term: 'Don gratuit', Icon: Gift },
] as const;

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const publishCta = usePublishCta();
  const { location: userLocation, openLocationModal } = useMarketLocation();
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [dealsListings, setDealsListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [proSellers, setProSellers] = useState<UserProfile[]>([]);
  const [listingsViewMode, setListingsViewMode] = useState<ListingViewMode>('grid');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      listingRepository.getListings({ limit: 12, sortBy: 'date_desc' }),
      listingRepository.getDealsListings(),
      userRepository.getAllProSellers(),
    ])
      .then(([listingsRes, deals, sellers]) => {
        if (!isMounted) return;
        setRecentListings(listingsRes.listings.slice(0, 8));
        setDealsListings(deals.slice(0, 4));
        if (Array.isArray(sellers)) {
          setProSellers(sellers);
        }
      })
      .catch((err) => {
        console.warn('Failed to load homepage data', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);


  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      {/* 1. Hero Section - Two Columns Balanced & Compact */}
      <section className="relative bg-[#FAF8F5] pt-4 sm:pt-6 pb-6 sm:pb-8 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full">
            {/* Column 1: Hero Pitch, Search & CTAs */}
            <div className="lg:col-span-7 space-y-4 lg:space-y-4.5 text-left flex flex-col justify-center w-full">
              <div className="space-y-2.5 sm:space-y-3">
                <div className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-stone-200/90 bg-white text-xs font-semibold text-stone-700 shadow-2xs w-fit">
                  <Sparkle className="w-3 h-3 text-primary fill-primary shrink-0" />
                  <span>Le marché local français de confiance</span>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-bold text-stone-900 tracking-[-0.02em] leading-[1.08]">
                  Trouvez la perle rare, <br className="hidden sm:inline" />
                  <span className="text-primary relative inline-block">
                    sans tracas.
                    <svg
                      aria-hidden="true"
                      className="absolute left-0 -bottom-1 sm:-bottom-1.5 w-full h-2.5 sm:h-3.5 text-primary/60 overflow-visible pointer-events-none"
                      viewBox="0 0 200 14"
                      preserveAspectRatio="none"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    >
                      <path d="M3 8.5C48 3.4 128 2.6 197 6.2" />
                      <path d="M12 12.6C61 9 121 8.6 186 11.4" strokeWidth="2" opacity="0.6" />
                    </svg>
                  </span>
                </h1>

                <p className="text-xs sm:text-sm text-stone-600 max-w-lg leading-relaxed font-normal">
                  Achetez et vendez en toute sérénité : paiements sécurisés,
                  livraison intégrée et vendeurs vérifiés.
                </p>
              </div>

              {/* Quick search suggestions */}
              <div className="w-full">
                <p className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-stone-600 mb-1.5 sm:mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Recherches populaires</span>
                </p>
                <ul className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {POPULAR_SEARCHES.map(({ term, Icon }) => (
                    <li key={term}>
                      <button
                        type="button"
                        onClick={() => navigate(routes.search(term))}
                        className="group inline-flex items-center gap-1.5 h-7.5 px-3 rounded-full bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-700 hover:text-stone-900 transition-all cursor-pointer font-medium text-[11px] sm:text-xs shadow-2xs active:scale-95"
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0 text-stone-400 group-hover:text-primary transition-colors" />
                        <span>{term}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hero Secondary Actions */}
              <div className="pt-0.5 sm:pt-1 w-full">
                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full sm:w-fit">
                  <button
                    type="button"
                    onClick={() => navigate(publishCta.to)}
                    className="h-10.5 sm:h-11 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-black text-white font-bold text-xs sm:text-sm shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto active:scale-95 whitespace-nowrap transition-all"
                  >
                    <PlusCircle className="w-4.5 h-4.5 text-primary shrink-0" />
                    <span>{publishCta.label}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(routes.search())}
                    className="h-10.5 sm:h-11 px-5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/90 hover:border-stone-300 text-stone-800 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 w-full sm:w-auto whitespace-nowrap"
                  >
                    <Search className="w-4 h-4 text-stone-400 shrink-0" />
                    <span>Explorer le catalogue</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Column 2: Boosted & Promoted Listings Auto-Scrolling */}
            <div className="lg:col-span-5 relative w-full flex flex-col justify-center min-w-0">
              <div className="w-full h-full flex flex-col">
                <HeroBoostedScroll />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. Trust Reassurance Bar */}
      <HomeTrustStrip />

      {/* 3. Upgraded Category Explorer */}
      <HomeCategoryExplorer />

      {/* 4. Curated Thematic Collections */}
      <HomeCollectionsSection />

      {/* 5. Fresh Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
        <div className="flex items-end justify-between gap-3 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Annonces récentes
            </h2>
            <p className="text-sm text-stone-500 mt-1 hidden sm:block font-medium">
              Les dernières offres publiées près de chez vous
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 mb-0.5">
            <ViewModeToggle
              viewMode={listingsViewMode}
              onChange={(mode) => setListingsViewMode(mode)}
              size="sm"
            />

            <Link
              to="/recherche?sortBy=date_desc"
              className="text-xs sm:text-sm font-bold text-stone-900 bg-white border border-stone-200/90 hover:border-stone-300 hover:bg-stone-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all shadow-2xs active:scale-95 flex items-center gap-1.5 w-fit shrink-0 whitespace-nowrap"
            >
              <span className="hidden sm:inline">Toutes les nouveautés</span>
              <span className="sm:hidden">Voir tout</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-600" />
            </Link>
          </div>
        </div>

        {isLoading ? (
          listingsViewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-3 border border-border-base space-y-3">
                  <Skeleton className="h-44 w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-3 border border-border-base flex gap-3">
                  <Skeleton className="h-32 w-32 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2 py-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : listingsViewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {recentListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} variant="grid" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:gap-4">
            {recentListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} variant="list" />
            ))}
          </div>
        )}
      </section>

      {/* 6. Deals & Price Drops Showcase */}
      {dealsListings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-warning-surface/70 via-stone-50/50 to-white rounded-3xl border border-warning-border p-4 sm:p-8 shadow-xs">
            <div className="flex items-end justify-between gap-3 mb-4 sm:mb-6">
              <div className="min-w-0 space-y-1">
                <h2 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  Meilleures offres
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-0.5 hidden sm:block font-medium">
                  Des réductions jusqu'à -50% sur des articles récents et vérifiés
                </p>
              </div>
              <Link
                to="/bons-plans"
                className="text-xs sm:text-sm font-bold text-stone-900 bg-white border border-warning-border hover:bg-warning-surface hover:border-warning px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 whitespace-nowrap shadow-2xs active:scale-95 w-fit mb-0.5"
              >
                <span className="hidden sm:inline">Toutes les offres</span>
                <span className="sm:hidden">Voir tout</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-600" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 auto-rows-fr gap-3 sm:gap-4">
              {dealsListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. Pro Banner CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-bg-base border border-border-base rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-xl sm:text-2xl font-black text-stone-900">
              Vous êtes commerçant, artisan ou concessionnaire ?
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Ouvrez votre vitrine officielle en quelques clics, bénéficiez du badge Pro certifié, de statistiques de rentabilité et importez vos catalogues en masse.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full md:w-auto">
            <Link
              to="/solutions-pro"
              className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl text-center transition-colors"
            >
              Découvrir les forfaits Pro
            </Link>
            <Link
              to="/inscription/professionnel"
              className="bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl text-center transition-colors shadow-xs"
            >
              Créer mon compte Pro
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
