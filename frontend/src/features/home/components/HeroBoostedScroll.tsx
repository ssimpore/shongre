import { isProSeller } from '../../../domains/user/user.domain';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { Listing } from '../../../types';
import { FavoriteButton } from '../../../design-system/primitives/FavoriteButton';
import { IconButton } from '../../../design-system/primitives/IconButton';
import { listingRepository } from '../../../repositories/listing.repository';
import { Image } from '../../../design-system/primitives/Image';
import { IMAGE_SIZES } from '../../../design-system/primitives/responsiveImage';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useMarketLocation } from '../../../app/providers/MarketLocationProvider';
import { formatPrice } from '../../../utilities/formatters';
import { useTranslation } from '../../../i18n/I18nProvider';

const MAX_FEATURED_LISTINGS = 8;
const STEP_MS = 4500;

interface HeroBoostedScrollProps {
  onListingClick?: (listing: Listing) => void;
}

function getListingPhotoUrl(photo: any): string {
  if (typeof photo === 'string') return photo;
  if (photo && typeof photo.url === 'string') return photo.url;
  return 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400&auto=format&fit=crop&q=80';
}

export const HeroBoostedScroll: React.FC<HeroBoostedScrollProps> = ({ onListingClick }) => {
  const { t } = useTranslation();
  const { activeMarket } = useMarketLocation();
  const [isPaused, setIsPaused] = useState(false);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  /* Scoped to the active market, and re-run when it changes. The rail is the
     most prominent inventory on the page, so a market-blind query here put
     another country's listings directly under the headline — the same promise
     the search page would then refuse to honour. */
  useEffect(() => {
    listingRepository
      .getListings({ marketCode: activeMarket.code, limit: 50 })
      .then((res) => {
        setAllListings(res.listings || []);
      })
      .catch(() => {
        setAllListings([]);
      });

    listingRepository
      .getFavorites()
      .then((favs) => {
        setFavorites(favs.map((f) => f.id));
      })
      .catch(() => {
        setFavorites([]);
      });
  }, [activeMarket.code]);

  // Load and sort listings: give explicit priority to the Sézane coat (list-105) and De'Longhi espresso (list-109)
  const promotedListings = useMemo(() => {
    const active = allListings.filter((l) => l && l.status === 'active');

    const sorted = [...active].sort((a, b) => {
      const getPriority = (item: Listing) => {
        if (item.id === 'list-105') return 100;
        if (item.id === 'list-109') return 90;
        return (item?.isBoosted ? 10 : 0) + (isProSeller(item) ? 5 : 0) + (item?.originalPrice ? 2 : 0);
      };
      return getPriority(b) - getPriority(a);
    });

    return sorted;
  }, [allListings]);

  const scrollSequence = useMemo(() => {
    const fallbackList = allListings.filter((l) => l && l.status === 'active').slice(0, 8);
    const list = promotedListings.length > 0 ? promotedListings : fallbackList;
    return list.slice(0, MAX_FEATURED_LISTINGS);
  }, [promotedListings, allListings]);

  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    setActiveIndex(0);
    railRef.current?.scrollTo({ left: 0, behavior: 'auto' });
  }, [activeMarket.code, scrollSequence.length]);

  useEffect(() => {
    if (isPaused || prefersReducedMotion || scrollSequence.length <= 1) return;

    const id = window.setInterval(() => {
      setActiveIndex((currentIndex) => {
        const nextIndex = (currentIndex + 1) % scrollSequence.length;
        const rail = railRef.current;
        rail?.scrollTo({
          left: nextIndex * rail.clientWidth,
          behavior: 'smooth',
        });
        return nextIndex;
      });
    }, STEP_MS);

    return () => clearInterval(id);
  }, [isPaused, prefersReducedMotion, scrollSequence.length]);

  const scrollToIndex = (index: number) => {
    const total = scrollSequence.length;
    if (total === 0) return;

    const nextIndex = (index + total) % total;
    const rail = railRef.current;
    rail?.scrollTo({
      left: nextIndex * rail.clientWidth,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
    setActiveIndex(nextIndex);
  };

  const handleScroll = () => {
    const rail = railRef.current;
    if (!rail || rail.clientWidth === 0) return;

    const nextIndex = Math.round(rail.scrollLeft / rail.clientWidth);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), scrollSequence.length - 1));
  };

  const handleToggleFavorite = async (e: React.MouseEvent, listingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const isFav = await listingRepository.toggleFavorite(listingId);
    setFavorites((prev) => (isFav ? [...prev, listingId] : prev.filter((id) => id !== listingId)));
  };

  /* A newly opened market may have no eligible featured listing. Collapsing
     the gallery avoids leaving an empty media well beside the hero copy. */
  if (scrollSequence.length === 0) return null;

  return (
    <section
      className="relative flex w-full max-w-full flex-1 flex-col justify-between"
      aria-label={t('home.heroBoostedScroll.carouselLabel')}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-sm">
        <div
          id="hero-boosted-track"
          ref={railRef}
          className="flex aspect-video w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth scrollbar-none"
          aria-label={t('home.heroBoostedScroll.carouselLabel')}
          onScroll={handleScroll}
        >
          {scrollSequence.map((item, index) => renderItemCard(item, index))}
        </div>

        {scrollSequence.length > 1 && (
          <>
            <IconButton
              variant="ghost"
              size="md"
              ariaLabel={t('home.heroBoostedScroll.previous')}
              aria-controls="hero-boosted-track"
              onClick={() => scrollToIndex(activeIndex - 1)}
              className="absolute left-3 top-1/2 z-raised -translate-y-1/2 rounded-full bg-stone-950/55 text-white shadow-sm backdrop-blur-xs hover:bg-stone-950/75 hover:text-white"
            >
              <ChevronLeft className="h-icon-lg w-icon-lg" />
            </IconButton>
            <IconButton
              variant="ghost"
              size="md"
              ariaLabel={t('home.heroBoostedScroll.next')}
              aria-controls="hero-boosted-track"
              onClick={() => scrollToIndex(activeIndex + 1)}
              className="absolute right-3 top-1/2 z-raised -translate-y-1/2 rounded-full bg-stone-950/55 text-white shadow-sm backdrop-blur-xs hover:bg-stone-950/75 hover:text-white"
            >
              <ChevronRight className="h-icon-lg w-icon-lg" />
            </IconButton>
          </>
        )}

        <div className="absolute bottom-3 right-4 z-raised flex items-center gap-1.5" aria-hidden="true">
          {scrollSequence.map((item, index) => (
            <span
              key={item.id}
              className={`h-2 rounded-full shadow-2xs transition-all duration-normal ${
                index === activeIndex ? 'w-4 bg-primary' : 'w-2 bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex min-h-6 items-center px-1">
        <p className="flex min-w-0 items-center gap-2 text-xs text-stone-600 sm:text-sm">
          <ShieldCheck className="h-icon-lg w-icon-lg shrink-0 text-success" />
          <span className="font-bold text-stone-800">{t('home.heroBoostedScroll.annoncesControlees')}</span>
          <span className="hidden truncate font-medium sm:inline">
            · {t('home.heroBoostedScroll.securiteFiabiliteEtQualiteAssurees')}
          </span>
        </p>
        <span className="sr-only" aria-live="polite">
          {activeIndex + 1} / {scrollSequence.length}
        </span>
      </div>
    </section>
  );

  function renderItemCard(item: Listing, index: number) {
    const isFav = favorites.includes(item.id);
    const photoUrl = getListingPhotoUrl(item.coverImageUrl || item.photos?.[0]);

    return (
      <article
        key={item.id}
        className="group relative h-full w-full shrink-0 snap-center overflow-hidden bg-stone-200"
        aria-label={`${index + 1} / ${scrollSequence.length}`}
      >
        <Link
          to={`/annonce/${item.id}`}
          onClick={() => onListingClick?.(item)}
          className="absolute inset-0 block focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-focus"
        >
          <Image
            src={photoUrl}
            alt={item.title}
            sizes={IMAGE_SIZES.gallery}
            className="h-full w-full object-cover transition-transform duration-slow group-hover:scale-[1.025]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-4 pb-5 text-white sm:p-5 sm:pb-5 sm:pr-32">
            <p className="mb-1.5 truncate text-micro font-bold uppercase tracking-wider text-orange-200 sm:text-xs">
              {item.categoryLabel || 'Mode & Accessoires'}
            </p>
            <h3 title={item.title} className="line-clamp-2 font-display text-base font-bold leading-snug sm:text-lg">
              {item.title}
            </h3>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-extrabold sm:text-lg">{formatPrice(item.price)}</span>
                {item.originalPrice && item.originalPrice > item.price && (
                  <span className="text-xs font-medium text-white/70 line-through sm:text-sm">
                    {formatPrice(item.originalPrice)}
                  </span>
                )}
              </div>

              <span className="inline-flex items-center gap-1 truncate text-xs font-medium text-white/85 sm:text-sm">
                <MapPin className="h-icon-sm w-icon-sm shrink-0" />
                {item.city || 'Lyon 2e'}
              </span>
              {item.deliveryOptions?.some((o) => o.available && o.type !== 'hand_delivery') && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-white/85 sm:text-sm">
                  <Truck className="h-icon-sm w-icon-sm" />
                  {t('home.heroBoostedScroll.livraison')}
                </span>
              )}
            </div>
          </div>
        </Link>

        <FavoriteButton
          isFavorite={isFav}
          onToggle={(e) => handleToggleFavorite(e, item.id)}
          size="lg"
          variant="floating"
          className="absolute left-4 top-4 z-raised"
        />
      </article>
    );
  }
};
