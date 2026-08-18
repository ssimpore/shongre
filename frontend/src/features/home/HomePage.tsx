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
  Wrench,
  Briefcase,
  Layers,
  ChevronRight,
  PlusCircle,
  Compass,
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
import { CategoryIcon } from '../../design-system/primitives/CategoryIcon';
import { ScrollRail } from '../../design-system/primitives/ScrollRail';
import { NewsletterSignup } from '../newsletter/components/NewsletterSignup';
import { usePublishCta } from '../../security/usePublishCta';
import { plural } from '../../utilities/formatters';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const publishCta = usePublishCta();
  const { location: userLocation, openLocationModal } = useMarketLocation();
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [dealsListings, setDealsListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [proSellers, setProSellers] = useState<UserProfile[]>([]);

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

  const popularSearches = [
    'Vélo gravel',
    'iPhone 15 Pro',
    'Peugeot 208',
    'Fauteuil vintage',
    'PS5',
    'Sézane',
    'Table teck',
    'Don gratuit',
  ];

  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      {/* 1. Hero Section - Two Columns Balanced */}
      <section className="relative bg-gradient-to-b from-[#FAF8F5] via-[#FFF3EF]/50 to-[#FAF8F5] pt-8 sm:pt-16 pb-10 sm:pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
            {/* Column 1: Hero Pitch, Search & CTAs */}
            <div className="lg:col-span-7 space-y-6 lg:space-y-8 text-left flex flex-col justify-center w-full">
              <div className="space-y-4">
                <h1 className="text-[32px] sm:text-5xl lg:text-6xl font-black text-stone-900 tracking-[-0.02em] leading-[1.1]">
                  Trouvez la perle rare, <br className="hidden sm:inline" />
                  <span className="text-primary relative inline-block">
                    sans tracas.
                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="3" fill="transparent"/>
                    </svg>
                  </span>
                </h1>

                <p className="text-sm sm:text-lg text-stone-600 max-w-lg leading-relaxed font-medium">
                  Le marché local français qui protège votre argent. Séquestre, livraison intégrée et vendeurs vérifiés.
                </p>
              </div>

              {/* Quick search suggestions. */}
              <div className="flex items-center gap-2 flex-wrap text-sm w-full">
                <span className="text-stone-500 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 mr-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Populaire :
                </span>
                {popularSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => navigate(routes.search(term))}
                    className="px-3 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 hover:text-stone-900 hover:border-stone-300 transition-all cursor-pointer font-semibold text-xs shadow-2xs shrink-0 active:scale-95"
                  >
                    {term}
                  </button>
                ))}
              </div>

              {/* Hero Secondary Actions. */}
              <div className="pt-2 sm:pt-4 w-full">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-fit">
                  <button
                    type="button"
                    onClick={() => navigate(publishCta.to)}
                    className="h-control-md px-6 sm:px-8 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-stone-950 text-white font-bold text-sm sm:text-base shadow-lg shadow-stone-900/10 hover:shadow-xl hover:shadow-stone-900/10 transition-all flex items-center justify-center gap-2.5 cursor-pointer w-full sm:w-auto active:scale-95 whitespace-nowrap"
                  >
                    <PlusCircle className="w-5 h-5 text-primary" />
                    <span>{publishCta.label}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(routes.search())}
                    className="h-control-md px-6 sm:px-8 rounded-xl bg-white hover:bg-stone-50 border-2 border-stone-200 text-stone-800 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm hover:shadow active:scale-95 w-full sm:w-auto whitespace-nowrap"
                  >
                    <Compass className="w-5 h-5 text-stone-400" />
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

      {/* 2. Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-12">
        <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Explorer par catégorie
            </h2>
            <p className="text-sm text-stone-500 mt-1 hidden sm:block font-medium">
              Découvrez des millions d'annonces classées selon votre besoin
            </p>
          </div>
          <Link
            to={routes.search()}
            className="text-sm font-bold text-stone-900 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 px-4 py-2 rounded-xl transition-all shadow-2xs active:scale-95 hidden sm:flex items-center gap-1.5"
          >
            <span>Toutes les annonces</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Below `sm` this is one horizontally scrolling row rather than a
            2-column grid: sixteen categories stacked eight rows deep pushed the
            listings themselves a full screen down the page. `ScrollRail` adds
            the edge fade and nudge buttons so the overflow is visible instead
            of implied. From `sm` up there is room to lay them all out at once,
            so it goes back to a grid. */}
        <ScrollRail label="catégories" className="-mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
          <div className="flex gap-3 sm:grid sm:grid-cols-4 lg:grid-cols-8 sm:gap-5">
            {TAXONOMY.map((cat) => (
              <Link
                key={cat.id}
                to={`/categorie/${cat.slug}`}
                className="group w-[104px] shrink-0 snap-start sm:w-auto bg-white rounded-[20px] border border-stone-200 hover:border-stone-300 hover:shadow-lg p-3 sm:p-5 flex flex-col items-center text-center transition-all duration-normal active:scale-95"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#FAF8F5] group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors shrink-0">
                  <CategoryIcon category={cat} size="lg" className="w-6 h-6 sm:w-8 sm:h-8 text-stone-700 group-hover:text-primary transition-colors" />
                </div>
                <h3
                  className="text-[13px] sm:text-sm font-bold text-stone-900 group-hover:text-primary transition-colors line-clamp-2 min-h-[2.5em] flex items-center justify-center text-center w-full leading-tight break-words"
                  title={cat.name}
                >
                  {getTaxonomyLabel(cat, 'compact')}
                </h3>
              </Link>
            ))}
          </div>
        </ScrollRail>
      </section>

      {/* 3. Fresh Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Annonces récentes
            </h2>
            <p className="text-sm text-stone-500 mt-1 hidden sm:block font-medium">
              Les dernières offres publiées près de chez vous
            </p>
          </div>
          <Link
            to="/recherche?sortBy=date_desc"
            className="text-sm font-bold text-stone-900 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 px-4 py-2 rounded-xl transition-all shadow-2xs active:scale-95 flex items-center gap-1.5"
          >
            <span className="hidden sm:inline">Toutes les nouveautés</span>
            <span className="sm:hidden">Voir tout</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {recentListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Deals & Price Drops Banner */}
      {dealsListings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-amber-900 to-stone-900 rounded-2xl p-4 sm:p-8 text-white">
            <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold mb-1">
                  <Tag className="w-3 h-3" />
                  Bonnes affaires
                </div>
                <h2 className="text-lg sm:text-3xl font-extrabold text-white truncate sm:whitespace-normal">
                  Meilleures offres
                </h2>
                <p className="text-xs sm:text-sm text-amber-200/80 mt-0.5 hidden sm:block">
                  Des réductions jusqu'à -50% sur des articles récents et vérifiés
                </p>
              </div>
              <Link
                to="/bons-plans"
                className="text-xs sm:text-sm font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-xl transition-colors shrink-0 flex items-center gap-1 whitespace-nowrap shadow-xs"
              >
                <span>Tout voir</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* The cards are the grid items themselves. They used to be wrapped
                in a white `rounded-2xl` box, which duplicated the card's own
                surface and corner at a different radius, and — because the
                wrapper was what the grid stretched — left the card inside it
                free to collapse to its content height. */}
            {/* `auto-rows-fr` because this showcase wraps to two rows on a
                phone, and a grid otherwise sizes each row to its own tallest
                card — leaving the two rows 22px apart at 320px. Four items is a
                small enough set for one uniform card height to be the right
                call. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 auto-rows-fr gap-3 sm:gap-4">
              {dealsListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. Newsletter Signup Band */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <NewsletterSignup variant="band" source="homepage" />
      </section>

      {/* 6. Pro Banner CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-bg-base border border-border-base rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-light text-primary text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Espace Professionnels Shongre
            </div>
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
