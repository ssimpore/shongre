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
import { CategoryIcon } from '../../design-system/primitives/CategoryIcon';
import { ScrollRail } from '../../design-system/primitives/ScrollRail';
import { NewsletterSignup } from '../newsletter/components/NewsletterSignup';
import { usePublishCta } from '../../security/usePublishCta';
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
      {/* 1. Hero Section - Two Columns Balanced */}
      {/* Flat warm ground, not the former top-to-bottom gradient: that tinted
          the whole band pink and left the listing card sitting in a stripe of
          it. The headline and the card carry the section on their own. */}
      <section className="relative bg-bg-base pt-5 sm:pt-10 pb-10 sm:pb-14 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
            {/* Column 1: Hero Pitch, Search & CTAs */}
            <div className="lg:col-span-7 space-y-5 lg:space-y-6 text-left flex flex-col justify-center w-full">
              <div className="space-y-4">
                <p className="inline-flex items-center gap-2 h-control-sm pl-3 pr-4 rounded-full border border-border-base bg-bg-surface text-xs font-semibold text-stone-700 shadow-2xs">
                  <Sparkle className="w-3.5 h-3.5 text-primary fill-primary shrink-0" />
                  Le marché local français de confiance
                </p>

                <h1 className="font-display text-[38px] sm:text-5xl lg:text-6xl font-bold text-stone-900 tracking-[-0.02em] leading-[1.05]">
                  Trouvez la perle rare, <br className="hidden sm:inline" />
                  <span className="text-primary relative inline-block">
                    sans tracas.
                    {/* Two offset strokes rather than one: a single curve at this
                        weight reads as a rule, and the second pass is what makes
                        it look drawn by hand. `stroke-linecap` keeps the ends
                        tapered instead of chopped. */}
                    <svg
                      aria-hidden="true"
                      className="absolute left-0 -bottom-1 sm:-bottom-2 w-full h-3 sm:h-4 text-primary/45 overflow-visible"
                      viewBox="0 0 200 14"
                      preserveAspectRatio="none"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    >
                      <path d="M3 8.5C48 3.4 128 2.6 197 6.2" />
                      <path d="M12 12.6C61 9 121 8.6 186 11.4" strokeWidth="2" opacity="0.55" />
                    </svg>
                  </span>
                </h1>

                <p className="text-sm sm:text-lg text-stone-600 max-w-xl leading-relaxed">
                  Achetez et vendez en toute sérénité : paiements sécurisés,
                  livraison intégrée et vendeurs vérifiés.
                </p>
              </div>

              {/* Quick search suggestions. The label sits on its own line so the
                  chips wrap as one even block instead of flowing around it. */}
              <div className="w-full">
                <p className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-2.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                  Recherches populaires
                </p>
                <ul className="flex items-center gap-2 flex-wrap">
                  {POPULAR_SEARCHES.map(({ term, Icon }) => (
                    <li key={term}>
                      <button
                        type="button"
                        onClick={() => navigate(routes.search(term))}
                        className="group inline-flex items-center gap-2 h-control-md px-3.5 rounded-full bg-bg-surface hover:bg-bg-subtle border border-border-base text-stone-700 hover:text-stone-900 hover:border-border-hover transition-all cursor-pointer font-semibold text-xs shadow-2xs active:scale-95"
                      >
                        <Icon className="w-4 h-4 shrink-0 text-stone-400 group-hover:text-primary transition-colors" />
                        {term}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hero Secondary Actions. */}
              <div className="pt-1 sm:pt-2 w-full">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-fit">
                  <button
                    type="button"
                    onClick={() => navigate(publishCta.to)}
                    className="h-control-touch px-5 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-stone-950 text-white font-bold text-sm sm:text-base shadow-lg shadow-stone-900/10 hover:shadow-xl hover:shadow-stone-900/10 transition-all inline-flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto active:scale-95 whitespace-nowrap"
                  >
                    <PlusCircle className="w-5 h-5 text-primary shrink-0" />
                    <span>{publishCta.label}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(routes.search())}
                    className="h-control-touch px-5 rounded-xl bg-bg-surface hover:bg-bg-subtle border border-border-base hover:border-border-hover text-stone-800 font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs hover:shadow-sm active:scale-95 w-full sm:w-auto whitespace-nowrap"
                  >
                    <ScanSearch className="w-5 h-5 text-stone-400 shrink-0" />
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
                className="group w-[104px] shrink-0 snap-start sm:w-auto bg-white rounded-card border border-stone-200 hover:border-stone-300 hover:shadow-lg p-3 sm:p-5 flex flex-col items-center text-center transition-all duration-normal active:scale-95"
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
