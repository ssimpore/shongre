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
      <section className="relative bg-gradient-to-b from-bg-base via-[#FFF8F5] to-bg-base pt-6 sm:pt-12 pb-8 sm:pb-14 border-b border-border-base overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch w-full">
            {/* Column 1: Hero Pitch, Search & CTAs */}
            <div className="lg:col-span-7 space-y-4 lg:space-y-6 text-left flex flex-col justify-center py-1 lg:py-4 w-full">
              <div className="space-y-2 sm:space-y-3">
                <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-[50px] font-black text-stone-900 tracking-tight leading-[1.15] sm:leading-[1.12]">
                  Achetez & vendez <br className="hidden sm:inline" />
                  <span className="text-primary">en toute sécurité</span>
                </h1>

                <p className="text-xs sm:text-base text-stone-600 max-w-lg leading-relaxed font-normal">
                  Paiement sécurisé avec séquestre et livraison garantie partout en France.
                </p>
              </div>

              {/* Quick search suggestions.
                  Search itself lives in the header, which is sticky and therefore
                  available from anywhere on the page — the hero no longer carries
                  a second copy of the same field. These chips remain because they
                  are shortcuts to results, not an input: each one navigates
                  straight to a search. */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs w-full">
                <span className="text-stone-500 font-semibold text-micro uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Tendance :
                </span>
                {popularSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => navigate(routes.search(term))}
                    className="px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white border border-border-base text-stone-600 hover:text-primary hover:border-primary-border transition-all cursor-pointer font-semibold text-xs shadow-2xs shrink-0"
                  >
                    {term}
                  </button>
                ))}
              </div>

              {/* Hero Secondary Actions.
                  From sm up the row shrinks to its content (`w-fit`) while the two
                  `1fr` tracks stay equal, so both buttons size to the wider label
                  rather than stretching across the column. Full-width stacked on
                  phones, where edge-to-edge is the better target. */}
              <div className="border-t border-stone-200/60 pt-2 sm:pt-3 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full sm:w-fit">
                  <button
                    type="button"
                    onClick={() => navigate(publishCta.to)}
                    className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-start gap-2.5 cursor-pointer w-full whitespace-nowrap"
                  >
                    <PlusCircle className="w-4 h-4 text-primary shrink-0" />
                    <span>{publishCta.label}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(routes.search())}
                    className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl border border-border-base bg-white hover:bg-bg-base text-stone-800 font-bold text-xs sm:text-sm flex items-center justify-start gap-2.5 transition-all cursor-pointer shadow-2xs w-full whitespace-nowrap"
                  >
                    <Compass className="w-4 h-4 text-primary shrink-0" />
                    <span>Explorer les annonces</span>
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-black text-stone-900 truncate sm:whitespace-normal">
              Explorer par catégorie
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5 hidden xs:block">
              Découvrez les annonces classées selon votre besoin
            </p>
          </div>
          <Link
            to={routes.search()}
            className="text-xs sm:text-sm font-bold text-primary hover:text-primary-hover hover:underline flex items-center gap-1 shrink-0 whitespace-nowrap bg-primary-light hover:bg-primary-light/80 sm:bg-transparent sm:hover:bg-transparent px-2.5 py-1.5 sm:p-0 rounded-xl transition-colors"
          >
            <span>Tout voir</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-4">
          {TAXONOMY.map((cat) => (
            <Link
              key={cat.id}
              to={`/categorie/${cat.slug}`}
              className="group bg-white rounded-2xl border border-border-base hover:border-primary hover:shadow-md p-2 sm:p-3.5 flex flex-col items-center text-center transition-all duration-normal"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-bg-base group-hover:bg-primary-light flex items-center justify-center mb-1.5 sm:mb-2 transition-colors shrink-0">
                <CategoryIcon category={cat} size="lg" />
              </div>
              <h3
                className="text-xs sm:text-xs font-bold text-stone-900 group-hover:text-primary transition-colors line-clamp-2 min-h-[2rem] flex items-center justify-center text-center w-full leading-tight break-words px-0.5"
                title={cat.name}
              >
                {getTaxonomyLabel(cat, 'compact')}
              </h3>
              <span className="hidden sm:block text-micro text-stone-500 mt-0.5">
                {plural(cat.subCategories.length, 'rubrique')}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Fresh Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-black text-stone-900 truncate sm:whitespace-normal">
              Annonces récentes
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5 hidden sm:block">
              Publiées aujourd'hui par des particuliers et des professionnels
            </p>
          </div>
          <Link
            to="/recherche?sortBy=date_desc"
            className="text-xs sm:text-sm font-bold text-primary hover:text-primary-hover hover:underline flex items-center gap-1 shrink-0 whitespace-nowrap bg-primary-light hover:bg-primary-light/80 sm:bg-transparent sm:hover:bg-transparent px-2.5 py-1.5 sm:p-0 rounded-xl transition-colors"
          >
            <span>Tout voir</span>
            <ArrowRight className="w-3.5 h-3.5" />
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {dealsListings.map((listing) => (
                <div key={listing.id} className="bg-white rounded-2xl overflow-hidden text-stone-900">
                  <ListingCard listing={listing} />
                </div>
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
