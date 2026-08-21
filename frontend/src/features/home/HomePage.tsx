import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  ScanSearch,
  PlusCircle,
  ShieldCheck,
  Truck,
  BadgeCheck,
  RefreshCw,
} from 'lucide-react';
import { listingRepository } from '../../repositories/listing.repository';
import { Listing } from '../../types';
import { ListingCard } from '../../design-system/primitives/ListingCard';
import { ListingRail } from '../../design-system/primitives/ListingRail';
import { Button } from '../../design-system/primitives/Button';
import { Container, EmptyState, Heading, ListingCardSkeleton, StatePanel } from '../../design-system';
import { useMarketLocation } from '../../app/providers/MarketLocationProvider';
import { HeroBoostedScroll } from './components/HeroBoostedScroll';
import { HomeRecentSearches } from './components/HomeRecentSearches';
import { TrendingNowSection } from './components/TrendingNowSection';
import { HomeCollectionsSection } from './components/HomeCollectionsSection';
import { usePublishCta } from '../../security/usePublishCta';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTranslation } from '../../i18n/I18nProvider';
import { PublishCtaButton } from '../../design-system/primitives/PublishCtaButton';
import { HomeSectionHeading } from './components/HomeSectionHeading';

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

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    description:
      "Achetez et vendez près de chez vous sur Shongre : véhicules, immobilier, mode, maison et high-tech, avec paiement sécurisé, livraison intégrée et vendeurs vérifiés.",
    canonicalPath: "/",
    type: 'website',
  });

  const publishCta = usePublishCta();
  const { activeMarket } = useMarketLocation();
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [dealsListings, setDealsListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

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
    setLoadError(false);

    const marketCode = activeMarket.code;

    Promise.all([
      listingRepository.getListings({ marketCode, limit: RECENT_COUNT, sortBy: 'date_desc' }),
      listingRepository.getListings({ marketCode, onlyDeals: true, limit: DEALS_COUNT, sortBy: 'date_desc' }),
    ])
      .then(([listingsRes, dealsRes]) => {
        if (!isMounted) return;
        setRecentListings(listingsRes.listings);
        setDealsListings(dealsRes.listings);
      })
      .catch(() => {
        if (!isMounted) return;
        setRecentListings([]);
        setDealsListings([]);
        setLoadError(true);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeMarket.code, loadAttempt]);


  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      {/* 1. Hero — pitch, search and the promoted rail */}
      <section className="relative overflow-hidden bg-bg-base py-3 sm:py-4">
        <Container className="relative z-raised">
          <div className="rounded-3xl bg-gradient-to-br from-bg-surface via-bg-surface to-primary-light/40 px-5 py-7 shadow-xs sm:p-8 lg:p-10">
            <div className="grid w-full grid-cols-1 items-stretch gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-12">
              {/* Column 1: Hero Pitch, Search & CTAs */}
              <div className="flex w-full flex-col justify-between text-left">
                <div className="flex flex-col gap-6 sm:gap-7">
                  <Heading as="h1" size="display-md" family="display">{t('home.homePage.trouvezLaPerleRare')}<br className="hidden sm:inline" />
                    <span className="text-primary relative inline-block">{t('home.homePage.sansTracas')}<svg
                        aria-hidden="true"
                        className="absolute left-0 -bottom-1 sm:-bottom-1.5 w-full h-2.5 sm:h-3.5 text-primary/70 overflow-visible pointer-events-none"
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
                  </Heading>

                  <p className="max-w-xl text-sm font-normal leading-relaxed text-stone-600 sm:text-base">{t('home.homePage.achetezEtVendezEnToute')}</p>
                </div>

                {/* Hero Secondary Actions */}
                <div className="w-full">
                  <div className="flex w-full flex-col gap-3 sm:w-fit sm:flex-row">
                    <PublishCtaButton size="md" />

                    <Button
                      to="/recherche"
                      variant="outline"
                      size="md"
                      leftIcon={<Search className="h-icon-lg w-icon-lg text-stone-500" />}
                      className="w-full sm:w-auto"
                    >
                      {t('home.homePage.explorerLeCatalogue')}
                    </Button>
                  </div>
                </div>

                <ul
                  className="mt-6 flex min-h-6 flex-wrap items-center gap-x-4 gap-y-3 border-t border-border-subtle pt-4 text-xs font-medium text-stone-700 sm:mt-7 sm:text-sm"
                  aria-label={t('home.homePage.garantiesShongre')}
                >
                  <li className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-icon-lg w-icon-lg shrink-0 text-primary" aria-hidden="true" />
                    {t('home.homePage.paiementsSecurises')}
                  </li>
                  <li className="inline-flex items-center gap-2 border-l border-border-base pl-4">
                    <Truck className="h-icon-lg w-icon-lg shrink-0 text-primary" aria-hidden="true" />
                    {t('home.homePage.livraisonIntegree')}
                  </li>
                  <li className="inline-flex items-center gap-2 border-l border-border-base pl-4">
                    <BadgeCheck className="h-icon-lg w-icon-lg shrink-0 text-primary" aria-hidden="true" />
                    {t('home.homePage.vendeursVerifies')}
                  </li>
                </ul>
              </div>

              {/* Column 2: Boosted & Promoted Listings Auto-Scrolling.
                  `empty:hidden` so the column stops reserving half the hero grid
                  when the rail collapses on a market with no listings. */}
              <div className="relative flex min-w-0 w-full flex-col empty:hidden">
                <HeroBoostedScroll />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 2. Recent searches — quick resume for visitor queries */}
      <HomeRecentSearches />

      {/* 3. Fresh listings — the first browsable inventory */}
      <Container as="section" className="mt-12 sm:mt-16">
        <div className="flex items-end justify-between gap-3 mb-6 sm:mb-8">
          <div className="min-w-0">
            <HomeSectionHeading>{t('home.homePage.annoncesRecentes')}</HomeSectionHeading>
            <p className="text-sm text-stone-500 mt-1 hidden sm:block font-medium">{t('home.homePage.lesDernieresOffresPublieesPres')}</p>
          </div>

          <Button
            to="/recherche?sortBy=date_desc"
            variant="secondary"
            size="sm"
            rightIcon={<ArrowRight className="w-icon-sm h-icon-sm text-stone-600" />}
            className="mb-0.5 shrink-0"
          >
            <span className="hidden sm:inline">{t('home.homePage.toutesLesNouveautes')}</span>
            <span className="sm:hidden">{t('home.homePage.voirTout')}</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {Array.from({ length: RECENT_COUNT }).map((_, idx) => (
              <ListingCardSkeleton
                key={idx}
                className="rounded-2xl border border-border-base bg-white p-3"
              />
            ))}
          </div>
        ) : loadError ? (
          <StatePanel
            variant="offline"
            title={t('common.error')}
            description={t('shell.errorBoundary.applicationARencontreUnProbleme')}
            action={
              <Button
                type="button"
                variant="primary"
                size="md"
                leftIcon={<RefreshCw className="h-icon-md w-icon-md" aria-hidden="true" />}
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
              >
                {t('common.retry')}
              </Button>
            }
            secondaryAction={
              <Button to="/recherche" variant="outline" size="md">
                {t('home.homePage.explorerLeCatalogue')}
              </Button>
            }
          />
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
        ) : (
          <ListingRail label={t('home.homePage.annoncesRecentes')}>
            {recentListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} variant="grid" />
            ))}
          </ListingRail>
        )}
      </Container>

      {/* 4. Deals & price drops */}
      {dealsListings.length > 0 && (
        <Container as="section">
          <div className="bg-gradient-to-br from-warning-surface/70 via-stone-50/50 to-white rounded-3xl border border-warning-border p-4 sm:p-8 shadow-xs">
            <div className="flex items-end justify-between gap-3 mb-4 sm:mb-6">
              <div className="min-w-0 space-y-1">
                <HomeSectionHeading>
                  {t('home.homePage.meilleuresOffres')}
                </HomeSectionHeading>
                <p className="text-xs sm:text-sm text-stone-600 mt-0.5 hidden sm:block font-medium">{t('home.homePage.desReductionsJusquA50')}</p>
              </div>
              <Button
                to="/bons-plans"
                variant="secondary"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-600" />}
                className="shrink-0 border-warning-border hover:border-warning hover:bg-warning-surface"
              >
                <span className="hidden sm:inline">{t('home.homePage.toutesLesOffres')}</span>
                <span className="sm:hidden">{t('home.homePage.voirTout')}</span>
              </Button>
            </div>

            <ListingRail label={t('home.homePage.meilleuresOffres')}>
              {dealsListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </ListingRail>
          </div>
        </Container>
      )}

      {/* 5. Dynamic marketplace discovery — placed after the commercial offer
          so the page flows from inventory to deals, then inspiration. */}
      <TrendingNowSection />

      {/* 6. Editorial collections — retained as a complementary browse surface */}
      <HomeCollectionsSection />

      {/* 7. Pro banner CTA */}
      <Container as="section">
        <div className="bg-bg-base border border-border-base rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-xl sm:text-2xl font-black text-stone-900">{t('home.homePage.vousEtesCommercantArtisanOu')}</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{t('home.homePage.ouvrezVotreVitrineOfficielleEn')}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full md:w-auto">
            <Button
              to="/solutions-pro"
              variant="pro"
              size="md"
              fullWidth
            >{t('home.homePage.decouvrirLesForfaitsPro')}</Button>
            <Button
              to="/inscription/professionnel"
              variant="primary"
              size="md"
              fullWidth
            >{t('home.homePage.creerMonComptePro')}</Button>
          </div>
        </div>
      </Container>
    </div>
  );
};
