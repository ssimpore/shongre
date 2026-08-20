import { routes } from '../../configuration/routes';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  
  
  ArrowRight,
  TrendingUp,
  
  
  
  
  
  Car,
  Home as 
  Smartphone,
  Shirt,
  Bike,
  Armchair,
  Gamepad2,
  Gift,
  Lamp,
  ScanSearch,
  Sparkle,
  
  
  
  
  PlusCircle
  
  
} from 'lucide-react';
import { listingRepository } from '../../repositories/listing.repository';
import { userRepository } from '../../repositories/user.repository';
import { Listing, UserProfile } from '../../types';
import { ListingCard } from '../../design-system/primitives/ListingCard';
import { SellerCard } from '../../design-system/primitives/SellerCard';
import { Button } from '../../design-system/primitives/Button';
import { EmptyState, Skeleton } from '../../design-system/primitives/UIComponents';
import { useMarketLocation } from '../../app/providers/MarketLocationProvider';
import { HeroBoostedScroll } from './components/HeroBoostedScroll';
import { HomeTrustStrip } from './components/HomeTrustStrip';
import { HomeCollectionsSection } from './components/HomeCollectionsSection';
import { HomeCategoryExplorer } from './components/HomeCategoryExplorer';
import { storageService } from '../../services/storage.service';
import { usePublishCta } from '../../security/usePublishCta';
import { ViewModeToggle, ListingViewMode } from '../../design-system/primitives/ViewModeToggle';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTranslation } from '../../i18n/I18nProvider';
import { PublishCtaButton } from '../../design-system/primitives/PublishCtaButton';

/**
 * How many cards each homepage rail shows.
 *
 * The two inventory rails were the thinnest sections on a page whose two
 * navigation sections were the most generous — 8 recent and 4 deals against
 * ~800px of category and collection tiles. Discovery surfaces should be the
 * dense ones.
 */
const RECENT_COUNT = 12;
const DEALS_COUNT = 8;
const PRO_SELLER_COUNT = 3;
/** Enough to be a useful shortcut, short enough to stay one row on desktop. */
const RECENTLY_VIEWED_COUNT = 6;

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
  const { t } = useTranslation();
  usePageMeta({
    description:
      "Achetez et vendez près de chez vous sur Shongre : véhicules, immobilier, mode, maison et high-tech, avec paiement sécurisé, livraison intégrée et vendeurs vérifiés.",
    canonicalPath: "/",
    type: 'website',
  });

  const navigate = useNavigate();
  const publishCta = usePublishCta();
  const { activeMarket } = useMarketLocation();
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [dealsListings, setDealsListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [proSellers, setProSellers] = useState<UserProfile[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Listing[]>([]);
  const [listingsViewMode, setListingsViewMode] = useState<ListingViewMode>('grid');

  /**
   * Every listing rail here is scoped to the active market, and the effect
   * re-runs when that market changes.
   *
   * Neither was true before: the homepage asked for listings with no
   * `marketCode` and a `[]` dependency list, while the search page has always
   * filtered by market. A visitor on the Belgian market therefore saw a full
   * homepage of French listings, clicked through, and landed on "0 annonce" —
   * the homepage promised inventory the rest of the product could not show.
   *
   * `getDealsListings()` is not used for the deals rail for the same reason:
   * it takes no filters and caps itself at 6. `getListings` already supports
   * `onlyDeals`, so both rails now go through one market-aware query.
   */
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const marketCode = activeMarket.code;

    Promise.all([
      listingRepository.getListings({ marketCode, limit: RECENT_COUNT, sortBy: 'date_desc' }),
      listingRepository.getListings({ marketCode, onlyDeals: true, limit: DEALS_COUNT, sortBy: 'date_desc' }),
      userRepository.getAllProSellers(),
      /* Resolve the viewing history against the catalogue rather than trusting
         the stored ids: a listing may since have been sold, withdrawn or moved
         to another market, and a "continue where you left off" rail that opens
         onto a dead listing is worse than no rail. Order follows the history,
         not the query, because recency is the entire point of the section. */
      Promise.all(
        storageService
          .getRecentlyViewed()
          .slice(0, RECENTLY_VIEWED_COUNT)
          .map((listingId) => listingRepository.getListingById(listingId)),
      ).then((items) =>
        items.filter(
          (item): item is Listing =>
            Boolean(item) &&
            item!.status === 'active' &&
            (item!.marketCodes ?? [item!.marketCode]).includes(marketCode),
        ),
      ),
    ])
      .then(([listingsRes, dealsRes, sellers, viewed]) => {
        if (!isMounted) return;
        setRecentListings(listingsRes.listings);
        setDealsListings(dealsRes.listings);
        if (Array.isArray(sellers)) {
          setProSellers(sellers.slice(0, PRO_SELLER_COUNT));
        }
        setRecentlyViewed(viewed);
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
  }, [activeMarket.code]);


  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      {/* 1. Hero — pitch, search and the promoted rail */}
      <section className="relative bg-[#FAF8F5] pt-4 sm:pt-6 pb-6 sm:pb-8 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full">
            {/* Column 1: Hero Pitch, Search & CTAs */}
            <div className="lg:col-span-7 space-y-4 lg:space-y-4.5 text-left flex flex-col justify-center w-full">
              <div className="space-y-2.5 sm:space-y-3">
                <div className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-stone-200/90 bg-white text-xs font-semibold text-stone-700 shadow-2xs w-fit">
                  <Sparkle className="w-3 h-3 text-primary fill-primary shrink-0" />
                  <span>{t('home.homePage.leMarcheLocalFrancaisDe')}</span>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-bold text-stone-900 tracking-[-0.02em] leading-[1.08]">{t('home.homePage.trouvezLaPerleRare')}<br className="hidden sm:inline" />
                  <span className="text-primary relative inline-block">{t('home.homePage.sansTracas')}<svg
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

                <p className="text-xs sm:text-sm text-stone-600 max-w-lg leading-relaxed font-normal">{t('home.homePage.achetezEtVendezEnToute')}</p>
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
                  <PublishCtaButton />

                  <button
                    type="button"
                    onClick={() => navigate(routes.search())}
                    className="h-10.5 sm:h-11 px-5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/90 hover:border-stone-300 text-stone-800 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 w-full sm:w-auto whitespace-nowrap"
                  >
                    <Search className="w-4 h-4 text-stone-400 shrink-0" />
                    <span>{t('home.homePage.explorerLeCatalogue')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Column 2: Boosted & Promoted Listings Auto-Scrolling.
                `empty:hidden` so the column stops reserving half the hero grid
                when the rail collapses on a market with no listings. */}
            <div className="lg:col-span-5 relative w-full flex flex-col justify-center min-w-0 empty:hidden">
              <HeroBoostedScroll />
            </div>
          </div>

        </div>
      </section>

      {/* 2. Category explorer — the main browse route, straight after the hero */}
      <HomeCategoryExplorer />

      {/* 3. Fresh listings — the first browsable inventory */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
        <div className="flex items-end justify-between gap-3 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight">{t('home.homePage.annoncesRecentes')}</h2>
            <p className="text-sm text-stone-500 mt-1 hidden sm:block font-medium">{t('home.homePage.lesDernieresOffresPublieesPres')}</p>
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
              <span className="hidden sm:inline">{t('home.homePage.toutesLesNouveautes')}</span>
              <span className="sm:hidden">{t('home.homePage.voirTout')}</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-600" />
            </Link>
          </div>
        </div>

        {isLoading ? (
          listingsViewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {Array.from({ length: RECENT_COUNT }).map((_, idx) => (
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
              {Array.from({ length: 6 }).map((_, idx) => (
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
        ) : recentListings.length === 0 ? (
          /* Scoping the rails to the active market means a market with no
             inventory yet now renders nothing rather than another market's
             listings — so it has to say so. Publishing is the honest call to
             action here: the market is empty because nobody has listed in it. */
          <EmptyState
            icon={<ScanSearch className="w-8 h-8 text-stone-400" />}
            title={`Aucune annonce sur le marché ${activeMarket.name} pour l'instant`}
            description={t('home.homePage.ceMarcheVientDOuvrir')}
            action={
              <Button to={publishCta.to} variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />}>
                {t(publishCta.labelKey)}
              </Button>
            }
          />
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

      {/* 3b. Resume where you left off.
             Rendered only when the visitor actually has a history — an empty
             "Vus récemment" rail is worse than no rail, and the section list
             above is deliberately free of placeholders. */}
      {recentlyViewed.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-3 mb-4 sm:mb-6">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight">{t('home.homePage.reprendreOuVousEnEtiez')}</h2>
              <p className="text-sm text-stone-500 mt-1 hidden sm:block font-medium">{t('home.homePage.lesAnnoncesQueVousAvez')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 auto-rows-fr gap-3 sm:gap-4">
            {recentlyViewed.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* 4. Trust reassurance — after the visitor has seen real goods */}
      <HomeTrustStrip />

      {/* 5. Deals & price drops */}
      {dealsListings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-warning-surface/70 via-stone-50/50 to-white rounded-3xl border border-warning-border p-4 sm:p-8 shadow-xs">
            <div className="flex items-end justify-between gap-3 mb-4 sm:mb-6">
              <div className="min-w-0 space-y-1">
                <h2 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  Meilleures offres
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-0.5 hidden sm:block font-medium">{t('home.homePage.desReductionsJusquA50')}</p>
              </div>
              <Link
                to="/bons-plans"
                className="text-xs sm:text-sm font-bold text-stone-900 bg-white border border-warning-border hover:bg-warning-surface hover:border-warning px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 whitespace-nowrap shadow-2xs active:scale-95 w-fit mb-0.5"
              >
                <span className="hidden sm:inline">{t('home.homePage.toutesLesOffres')}</span>
                <span className="sm:hidden">{t('home.homePage.voirTout')}</span>
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

      {/* 6. Curated thematic collections — editorial browse */}
      <HomeCollectionsSection />

      {/* 7. Pro storefronts — supply-side discovery.
             `getAllProSellers()` was already called on every homepage load and
             the result dropped on the floor: `proSellers` was set and never
             read, and `SellerCard` was imported and never used. The platform
             has storefronts, a pro directory and verified badges, none of which
             the homepage surfaced. */}
      {proSellers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-3 mb-6 sm:mb-8">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight">
                Boutiques Pro
              </h2>
              <p className="text-sm text-stone-500 mt-1 hidden sm:block font-medium">{t('home.homePage.desProfessionnelsVerifiesAvecCatalogue')}</p>
            </div>

            <Link
              to="/professionnels"
              className="text-xs sm:text-sm font-bold text-stone-900 bg-white border border-stone-200/90 hover:border-stone-300 hover:bg-stone-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all shadow-2xs active:scale-95 flex items-center gap-1.5 w-fit shrink-0 whitespace-nowrap mb-0.5"
            >
              <span className="hidden sm:inline">{t('home.homePage.tousLesProfessionnels')}</span>
              <span className="sm:hidden">{t('home.homePage.voirTout')}</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-600" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {proSellers.map((seller) => (
              <SellerCard key={seller.id} user={seller} />
            ))}
          </div>
        </section>
      )}

      {/* 8. Pro banner CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-bg-base border border-border-base rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-xl sm:text-2xl font-black text-stone-900">{t('home.homePage.vousEtesCommercantArtisanOu')}</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{t('home.homePage.ouvrezVotreVitrineOfficielleEn')}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full md:w-auto">
            <Link
              to="/solutions-pro"
              className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl text-center transition-colors"
            >{t('home.homePage.decouvrirLesForfaitsPro')}</Link>
            <Link
              to="/inscription/professionnel"
              className="bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl text-center transition-colors shadow-xs"
            >{t('home.homePage.creerMonComptePro')}</Link>
          </div>
        </div>
      </section>
    </div>
  );
};
