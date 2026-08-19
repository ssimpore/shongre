import { isProSeller } from '../../../domains/user/user.domain';
import { routes } from '../../../configuration/routes';
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkle,
  ChevronRight,
  MapPin,
  Truck,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Listing } from '../../../types';
import { FavoriteButton } from '../../../design-system/primitives/FavoriteButton';
import { listingRepository } from '../../../repositories/listing.repository';
import { Image } from '../../../design-system/primitives/Image';
import { IMAGE_SIZES } from '../../../design-system/primitives/responsiveImage';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { formatPrice } from '../../../utilities/formatters';

/* Rail geometry: 2 cards perfectly filling the compact viewport without clipping or scrollbars. */
const RAIL_CARD_H = 108; // px - compact height
const RAIL_GAP = 8; // px
const RAIL_CARD_MOBILE_H = 120;
const VISIBLE = 2; // exactly 2 listings visible at once

interface HeroBoostedScrollProps {
  onListingClick?: (listing: Listing) => void;
}

function getListingPhotoUrl(photo: any): string {
  if (typeof photo === 'string') return photo;
  if (photo && typeof photo.url === 'string') return photo.url;
  return 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400&auto=format&fit=crop&q=80';
}

export const HeroBoostedScroll: React.FC<HeroBoostedScrollProps> = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    listingRepository
      .getListings({ limit: 50 })
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
  }, []);

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
    if (!list || list.length === 0) return [];

    let res = [...list];
    while (res.length < 4) {
      res = [...res, ...list];
    }
    return res;
  }, [promotedListings, allListings]);

  const isDesktopRail = useMediaQuery('(min-width: 640px)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const STEP_MS = 4500;
  const [step, setStep] = useState(0);
  const [animate, setAnimate] = useState(true);

  const loopItems = useMemo(
    () => (scrollSequence.length ? [...scrollSequence, ...scrollSequence.slice(0, VISIBLE)] : []),
    [scrollSequence]
  );

  useEffect(() => {
    setStep(0);
  }, [scrollSequence.length]);

  useEffect(() => {
    if (!isDesktopRail || isPaused || prefersReducedMotion) return;
    if (scrollSequence.length <= VISIBLE) return;
    const id = setInterval(() => setStep((s) => s + 1), STEP_MS);
    return () => clearInterval(id);
  }, [isDesktopRail, isPaused, prefersReducedMotion, scrollSequence.length]);

  // Reaching the cloned tail means loop resets smoothly
  useEffect(() => {
    if (step !== scrollSequence.length || scrollSequence.length === 0) return;
    const id = setTimeout(() => {
      setAnimate(false);
      setStep(0);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    }, 600);
    return () => clearTimeout(id);
  }, [step, scrollSequence.length]);

  const handleToggleFavorite = async (e: React.MouseEvent, listingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const isFav = await listingRepository.toggleFavorite(listingId);
    setFavorites((prev) => (isFav ? [...prev, listingId] : prev.filter((id) => id !== listingId)));
  };

  return (
    <section
      className="relative w-full max-w-full rounded-2xl sm:rounded-3xl bg-white border border-stone-200/80 p-3 sm:p-4 shadow-lg shadow-stone-200/40 flex flex-col justify-between overflow-hidden"
      aria-labelledby="hero-boosted-heading"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      {/* 1. Header with Vedettes, Direct, and Voir plus > */}
      <div className="shrink-0 mb-2.5 sm:mb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-light border border-primary-border text-primary text-[11px] sm:text-xs font-bold shrink-0 shadow-2xs">
              <Sparkle className="w-3 h-3 fill-primary text-primary" />
              <h2 id="hero-boosted-heading" className="text-[11px] sm:text-xs font-bold text-primary">
                Vedettes
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success-surface text-success border border-success-border text-[11px] sm:text-xs font-bold shrink-0 shadow-2xs">
              <ShieldCheck className="w-3 h-3" />
              Direct
            </span>
          </div>

          <Link
            to={routes.search()}
            className="inline-flex items-center gap-0.5 h-7 px-2.5 rounded-full border border-stone-200/90 bg-white hover:bg-stone-50 hover:border-stone-300 text-[11px] sm:text-xs font-semibold text-stone-700 hover:text-stone-900 transition-colors shrink-0 shadow-2xs"
          >
            Voir plus
            <ChevronRight className="w-3 h-3 text-stone-400" />
          </Link>
        </div>
      </div>

      {/* 2. Listings Track Section */}
      <div
        className="relative mb-2.5 overflow-hidden w-full max-w-full sm:h-(--rail-viewport) min-h-(--rail-card-mobile-h) sm:min-h-(--rail-viewport) shrink-0"
        style={
          {
            '--rail-card-h': `${RAIL_CARD_H}px`,
            '--rail-card-mobile-h': `${RAIL_CARD_MOBILE_H}px`,
            '--rail-gap': `${RAIL_GAP}px`,
            '--rail-viewport': `${VISIBLE * RAIL_CARD_H + (VISIBLE - 1) * RAIL_GAP}px`,
          } as React.CSSProperties
        }
      >
        {isDesktopRail ? (
          <div
            className={`flex flex-col gap-(--rail-gap) will-change-transform w-full max-w-full ${
              animate ? 'transition-transform duration-slow ease-out-soft' : ''
            }`}
            style={{ transform: `translate3d(0, -${step * (RAIL_CARD_H + RAIL_GAP)}px, 0)` }}
          >
            {loopItems.map((item, index) => renderItemCard(item, `vert-${item.id}-${index}`))}
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory scrollbar-none">
            {scrollSequence.map((item, index) => renderItemCard(item, `horiz-${item.id}-${index}`))}
          </div>
        )}
      </div>

      {/* 3. Reassurance strip with checkmark shield badge */}
      <div className="shrink-0 relative overflow-hidden rounded-xl bg-[#FAF8F5] border border-stone-200/70 px-3 py-2 flex items-center justify-between">
        <div className="relative z-10 min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-stone-900">
            <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
            Annonces contrôlées
          </p>
          <p className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 ml-5 font-medium">
            Sécurité, fiabilité et qualité assurées.
          </p>
        </div>

        {/* Soft orange check watermark badge */}
        <div className="relative z-10 shrink-0 ml-2">
          <div className="w-7.5 h-7.5 rounded-lg bg-gradient-to-br from-orange-100/90 to-orange-50/50 border border-orange-200/80 flex items-center justify-center text-primary shadow-2xs">
            <Check className="w-4 h-4 text-primary stroke-[2.5]" />
          </div>
        </div>
      </div>
    </section>
  );

  function renderItemCard(item: Listing, key: string) {
    const isFav = favorites.includes(item.id);
    const photoUrl = getListingPhotoUrl(item.coverImageUrl || item.photos?.[0]);

    return (
      <Link
        key={key}
        to={`/annonce/${item.id}`}
        className="group relative flex items-stretch gap-3 sm:gap-3.5 p-1 sm:p-1.5 rounded-xl hover:bg-stone-50/90 transition-colors duration-normal w-[290px] sm:w-full max-w-full shrink-0 h-(--rail-card-mobile-h) sm:h-(--rail-card-h) overflow-hidden box-border snap-start"
      >
        {/* Floating favorite button */}
        <span className="absolute top-1.5 right-1.5 z-10">
          <FavoriteButton
            isFavorite={isFav}
            onToggle={(e) => handleToggleFavorite(e, item.id)}
            size="sm"
            variant="floating"
          />
        </span>

        {/* Left Photo Thumbnail */}
        <div className="relative w-24 sm:w-32 h-full rounded-xl overflow-hidden shrink-0 bg-stone-100">
          <Image
            src={photoUrl}
            alt={item.title}
            sizes={IMAGE_SIZES.compact}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Right Info Box */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 overflow-hidden">
          <div className="min-w-0">
            {/* Category tag */}
            <div className="pr-7 mb-0.5">
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-primary truncate">
                {item.categoryLabel || 'Mode & Accessoires'}
              </span>
            </div>

            {/* Title */}
            <h3
              title={item.title}
              className="text-xs sm:text-[13px] font-bold text-stone-900 line-clamp-2 group-hover:text-primary transition-colors leading-snug pr-7"
            >
              {item.title}
            </h3>
          </div>

          <div className="min-w-0">
            {/* Price line with strikethrough if original price */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs sm:text-sm font-extrabold text-stone-900">
                {formatPrice(item.price)}
              </span>
              {item.originalPrice && item.originalPrice > item.price && (
                <span className="text-[10px] sm:text-xs text-stone-500 line-through font-normal">
                  {formatPrice(item.originalPrice)}
                </span>
              )}
            </div>

            {/* Location & Delivery */}
            <div className="flex items-center gap-2.5 mt-0.5 text-[10px] sm:text-[11px] text-stone-500 flex-wrap">
              <span className="flex items-center gap-1 font-medium truncate">
                <MapPin className="w-3 h-3 shrink-0 text-stone-400" />
                {item.city || 'Lyon 2e'}
              </span>
              {item.deliveryOptions?.some((o) => o.available && o.type !== 'hand_delivery') && (
                <span className="inline-flex items-center gap-1 font-medium text-stone-500">
                  <Truck className="w-3 h-3 text-stone-400" />
                  Livraison
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }
};

