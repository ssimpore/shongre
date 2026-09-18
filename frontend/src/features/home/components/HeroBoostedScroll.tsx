import { PAGE_SIZES } from "../../../configuration/pagination.config";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Listing } from "../../../types";
import { IconButton } from "../../../design-system/primitives/IconButton";
import { RAIL_CONTROL_ICON_CLASS } from "../../../design-system/utils/controlMetrics";
import { services } from "../../../api/client/service-registry";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { useTranslation } from "../../../i18n/I18nProvider";
import { useFavorites } from "../../../app/providers/FavoritesProvider";
import { ListingCardViewCard } from "../../../design-system/primitives/ListingCard";
import {
  getGenericListingCardHref,
  projectGenericListingCardView,
} from "../../../domains/listing/listing-card.generic-presentation";
import { selectHeroListings } from "../hero-selection";

const STEP_MS = 4500;
/** Upper bound on a smooth rail scroll, after which snapping is restored. */
const SCROLL_SETTLE_MS = 700;

interface HeroBoostedScrollProps {
  onListingClick?: (listing: Listing) => void;
  /**
   * The rail's selection for the active market when the document already
   * carries it; the rail then paints without a round trip.
   */
  initialListings?: Listing[];
}

/**
 * Moves a snap rail to an exact offset.
 *
 * `scroll-snap-type: mandatory` is what makes swiping the rail feel right on
 * touch, but it also lets the browser veto programmatic scrolls: once the rail
 * is resting off-grid, both `scrollTo` and a direct `scrollLeft` assignment are
 * refused and the carousel is stuck for good. Suspending snapping for the
 * duration of the move — the same thing that unblocks it by hand in the console
 * — lets the offset land, and restoring it afterwards re-snaps to the boundary
 * we just scrolled to, so touch behaviour is unchanged.
 */
function scrollRailTo(rail: HTMLElement, left: number, smooth: boolean): void {
  const previousSnapType = rail.style.scrollSnapType;
  rail.style.scrollSnapType = "none";
  rail.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });

  const restore = () => {
    rail.style.scrollSnapType = previousSnapType;
  };

  if (!smooth) {
    restore();
    return;
  }

  // `scrollend` is not implemented everywhere yet, so the timeout is the floor.
  const done = () => {
    window.clearTimeout(timer);
    rail.removeEventListener("scrollend", done);
    restore();
  };
  const timer = window.setTimeout(done, SCROLL_SETTLE_MS);
  rail.addEventListener("scrollend", done, { once: true });
}

export const HeroBoostedScroll: React.FC<HeroBoostedScrollProps> = ({
  onListingClick,
  initialListings,
}) => {
  const { t } = useTranslation();
  const { activeMarket, currentLocale, convertMoney } = useMarketLocation();
  const {
    canModifyFavorites,
    favoriteIds: favorites,
    favoriteLoadState,
    refreshFavorites,
    toggleFavorite,
  } = useFavorites();
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [allListings, setAllListings] = useState<Listing[]>(
    initialListings ?? [],
  );
  const [isLoading, setIsLoading] = useState(!initialListings);
  const [activeIndex, setActiveIndex] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  // Read by the resize observer, which must not re-subscribe on every slide.
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;
  // The market whose selection arrived with the document, until it changes.
  const seededMarketRef = useRef(initialListings ? activeMarket.code : null);

  /* Scoped to the active market, and re-run when it changes. The rail is the
     most prominent inventory on the page, so a market-blind query here put
     another country's listings directly under the headline — the same promise
     the search page would then refuse to honour. */
  useEffect(() => {
    if (seededMarketRef.current === activeMarket.code) return;
    seededMarketRef.current = null;
    let active = true;
    setIsLoading(true);
    setAllListings([]);
    services.listings
      .getListings({
        marketCode: activeMarket.code,
        limit: PAGE_SIZES.homepagePromotedListings,
      })
      .then((res) => {
        if (active) setAllListings(res.listings || []);
      })
      .catch(() => {
        if (active) setAllListings([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeMarket.code]);

  const scrollSequence = useMemo(
    () =>
      selectHeroListings(allListings, currentLocale, activeMarket.code).map(
        (listing) => ({
          listing,
          card: projectGenericListingCardView(
            listing,
            currentLocale,
            activeMarket.code,
            undefined,
            convertMoney,
          ),
        }),
      ),
    [activeMarket.code, allListings, convertMoney, currentLocale],
  );
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );

  useEffect(() => {
    setActiveIndex(0);
    const rail = railRef.current;
    if (rail) scrollRailTo(rail, 0, false);
  }, [activeMarket.code, scrollSequence.length]);

  useEffect(() => {
    if (
      isInteractionPaused ||
      isUserPaused ||
      prefersReducedMotion ||
      scrollSequence.length <= 1
    ) {
      return;
    }

    const id = window.setInterval(() => {
      setActiveIndex((currentIndex) => {
        const nextIndex = (currentIndex + 1) % scrollSequence.length;
        const rail = railRef.current;
        if (rail) scrollRailTo(rail, nextIndex * rail.clientWidth, true);
        return nextIndex;
      });
    }, STEP_MS);

    return () => clearInterval(id);
  }, [
    isInteractionPaused,
    isUserPaused,
    prefersReducedMotion,
    scrollSequence.length,
  ]);

  /* A resize changes the slide pitch, so the pixel offset that used to sit on a
     slide boundary no longer does. Nothing re-aligned the rail, which left it
     resting between two slides — clipping the featured listing and, because a
     mandatory snap container then refuses further programmatic scrolls, killing
     the arrows and the autoplay with it. Re-anchor to the active slide instead. */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const realign = () => {
      const width = rail.clientWidth;
      if (width === 0) return;
      scrollRailTo(rail, activeIndexRef.current * width, false);
    };

    const observer = new ResizeObserver(realign);
    observer.observe(rail);
    return () => observer.disconnect();
  }, []);

  const scrollToIndex = (index: number) => {
    const total = scrollSequence.length;
    if (total === 0) return;

    const nextIndex = (index + total) % total;
    const rail = railRef.current;
    if (rail)
      scrollRailTo(rail, nextIndex * rail.clientWidth, !prefersReducedMotion);
    setActiveIndex(nextIndex);
  };

  /* The rail is the source of truth for which slide is showing. Deriving the
     dots from state alone let the indicator advance while the DOM stood still. */
  const handleScroll = () => {
    const rail = railRef.current;
    if (!rail || rail.clientWidth === 0) return;

    const nextIndex = Math.round(rail.scrollLeft / rail.clientWidth);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), scrollSequence.length - 1));
  };

  /* A newly opened market may have no eligible featured listing. Collapsing
     the gallery avoids leaving an empty media well beside the hero copy. */
  if (scrollSequence.length === 0) {
    return isLoading ? (
      <div
        data-home-boosted-surface="true"
        className="skeleton-shimmer h-listing-card-list-height w-full rounded-listing-card bg-bg-muted lg:h-listing-card-hero-height"
        aria-hidden="true"
      />
    ) : null;
  }

  return (
    <section
      data-home-boosted-carousel="true"
      className="relative flex w-full max-w-full flex-col justify-between"
      aria-label={t("home.heroBoostedScroll.carouselLabel")}
      aria-roledescription="carrousel"
      onMouseEnter={() => setIsInteractionPaused(true)}
      onMouseLeave={() => setIsInteractionPaused(false)}
      onFocusCapture={() => setIsInteractionPaused(true)}
      onBlurCapture={() => setIsInteractionPaused(false)}
    >
      {/* The slide titles are `h3`, so the homepage outline went h1 -> h3 with
          nothing in between. Hidden visually — the rail is self-evident. */}
      <h2 className="sr-only">{t("home.heroBoostedScroll.carouselLabel")}</h2>

      <div
        data-home-boosted-surface="true"
        className="relative isolate h-listing-card-list-height rounded-listing-card lg:h-listing-card-hero-height"
      >
        <div
          id="hero-boosted-track"
          ref={railRef}
          className="relative z-base flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none"
          aria-label={t("home.heroBoostedScroll.carouselLabel")}
          tabIndex={0}
          onScroll={handleScroll}
          onKeyDown={(event) => {
            if (event.currentTarget !== event.target) return;
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              scrollToIndex(activeIndex - 1);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              scrollToIndex(activeIndex + 1);
            }
          }}
        >
          {scrollSequence.map(({ listing, card }, index) => {
            const distance = Math.abs(index - activeIndex);
            const isAdjacent =
              distance <= 1 || distance === scrollSequence.length - 1;
            return isAdjacent ? (
              <div
                key={listing.id}
                data-hero-listing-slide="true"
                role="group"
                aria-roledescription="diapositive"
                aria-label={`${index + 1} / ${scrollSequence.length}`}
                aria-hidden={index !== activeIndex}
                inert={index !== activeIndex}
                className="flex h-full w-full shrink-0 snap-center items-center justify-center"
              >
                <ListingCardViewCard
                  listing={card}
                  href={getGenericListingCardHref(listing)}
                  variant="hero"
                  className="listing-card-hero-horizontal mx-auto"
                  imagePriority={index === 0}
                  isFavorite={favoriteSet.has(listing.id)}
                  favoriteLoadState={favoriteLoadState}
                  onFavoriteToggle={
                    canModifyFavorites
                      ? () => toggleFavorite(listing.id)
                      : undefined
                  }
                  onFavoriteRetry={
                    canModifyFavorites ? refreshFavorites : undefined
                  }
                  onNavigate={() => onListingClick?.(listing)}
                />
              </div>
            ) : (
              <div
                key={listing.id}
                aria-hidden="true"
                className="h-full w-full shrink-0 snap-center"
              />
            );
          })}
        </div>

        {scrollSequence.length > 1 && (
          <>
            <IconButton
              variant="ghost"
              size="sm"
              ariaLabel={t("home.heroBoostedScroll.previous")}
              aria-controls="hero-boosted-track"
              onClick={() => scrollToIndex(activeIndex - 1)}
              /* Hidden on phones: the card is short enough there that a
                 vertically centred arrow lands on top of the title overlay —
                 measured overlapping at 375px and on an iPhone 13 — and the
                 rail already swipes. */
              className="absolute inset-y-0 left-2 z-raised my-auto hidden rounded-full bg-surface-inverse-deep/60 text-text-inverse shadow-sm backdrop-blur-xs hover:bg-surface-inverse-deep/80 hover:text-text-inverse sm:left-3 sm:inline-flex"
            >
              <ChevronLeft className={RAIL_CONTROL_ICON_CLASS} />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              ariaLabel={t("home.heroBoostedScroll.next")}
              aria-controls="hero-boosted-track"
              onClick={() => scrollToIndex(activeIndex + 1)}
              className="absolute inset-y-0 right-2 z-raised my-auto hidden rounded-full bg-surface-inverse-deep/60 text-text-inverse shadow-sm backdrop-blur-xs hover:bg-surface-inverse-deep/80 hover:text-text-inverse sm:right-3 sm:inline-flex"
            >
              <ChevronRight className={RAIL_CONTROL_ICON_CLASS} />
            </IconButton>
          </>
        )}

        <div className="absolute bottom-3 right-4 z-raised flex items-center gap-3">
          {scrollSequence.length > 1 ? (
            <IconButton
              variant="secondary"
              size="sm"
              ariaLabel={t(
                isUserPaused
                  ? "home.heroBoostedScroll.play"
                  : "home.heroBoostedScroll.pause",
              )}
              aria-controls="hero-boosted-track"
              aria-pressed={isUserPaused}
              onClick={() => setIsUserPaused((current) => !current)}
              className="shrink-0 rounded-full shadow-sm"
            >
              {isUserPaused ? (
                <Play className="h-icon-sm w-icon-sm" aria-hidden="true" />
              ) : (
                <Pause className="h-icon-sm w-icon-sm" aria-hidden="true" />
              )}
            </IconButton>
          ) : null}

          <div
            data-hero-carousel-indicators="true"
            className="hidden items-center gap-1.5 sm:flex"
            aria-hidden="true"
          >
            {scrollSequence.map(({ listing }, index) => (
              <span
                key={listing.id}
                className={`h-2 rounded-pill shadow-2xs motion-interactive ${
                  index === activeIndex
                    ? "w-4 bg-primary"
                    : "w-2 bg-border-base"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only" aria-live="polite">
        {activeIndex + 1} / {scrollSequence.length}
      </span>
    </section>
  );
};
