import { PAGE_SIZES } from "../../../configuration/pagination.config";
import { isProSeller } from "../../../domains/user/user.domain";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, MapPin, Truck } from "lucide-react";
import { Listing } from "../../../types";
import { FavoriteButton } from "../../../design-system/primitives/FavoriteButton";
import { IconButton } from "../../../design-system/primitives/IconButton";
import { Badge } from "../../../design-system/primitives/Badge";
import { listingRepository } from "../../../repositories/listing.repository";
import { Image } from "../../../design-system/primitives/Image";
import { IMAGE_SIZES } from "../../../design-system/primitives/responsiveImage";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { formatPrice } from "../../../utilities/formatters";
import { useTranslation } from "../../../i18n/I18nProvider";
import { getListingCategoryLabel } from "../../../domains/taxonomy/taxonomy.display";

const MAX_FEATURED_LISTINGS = 8;
const STEP_MS = 4500;
/** Upper bound on a smooth rail scroll, after which snapping is restored. */
const SCROLL_SETTLE_MS = 700;

interface HeroBoostedScrollProps {
  onListingClick?: (listing: Listing) => void;
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

function getListingPhotoUrl(photo: any): string {
  if (typeof photo === "string") return photo;
  if (photo && typeof photo.url === "string") return photo.url;
  return "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400&auto=format&fit=crop&q=80";
}

export const HeroBoostedScroll: React.FC<HeroBoostedScrollProps> = ({
  onListingClick,
}) => {
  const { t } = useTranslation();
  const { activeMarket } = useMarketLocation();
  const [isPaused, setIsPaused] = useState(false);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  // Read by the resize observer, which must not re-subscribe on every slide.
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;

  /* Scoped to the active market, and re-run when it changes. The rail is the
     most prominent inventory on the page, so a market-blind query here put
     another country's listings directly under the headline — the same promise
     the search page would then refuse to honour. */
  useEffect(() => {
    listingRepository
      .getListings({
        marketCode: activeMarket.code,
        limit: PAGE_SIZES.homepagePromotedListings,
      })
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
    const active = allListings.filter((l) => l && l.status === "active");

    const sorted = [...active].sort((a, b) => {
      const getPriority = (item: Listing) => {
        if (item.id === "list-105") return 100;
        if (item.id === "list-109") return 90;
        return (
          (item?.isBoosted ? 10 : 0) +
          (isProSeller(item) ? 5 : 0) +
          (item?.originalPrice ? 2 : 0)
        );
      };
      return getPriority(b) - getPriority(a);
    });

    return sorted;
  }, [allListings]);

  const scrollSequence = useMemo(() => {
    const fallbackList = allListings
      .filter((l) => l && l.status === "active")
      .slice(0, 8);
    const list = promotedListings.length > 0 ? promotedListings : fallbackList;
    return list.slice(0, MAX_FEATURED_LISTINGS);
  }, [promotedListings, allListings]);
  const isFeaturedListing = (listing: Listing): boolean => {
    if (listing.discovery?.isSponsored) return true;
    if (listing.promotionState === "active") {
      return listing.promotionType !== "urgent_badge";
    }
    return Boolean(listing.isBoosted && listing.boostType !== "urgent");
  };

  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );

  useEffect(() => {
    setActiveIndex(0);
    const rail = railRef.current;
    if (rail) scrollRailTo(rail, 0, false);
  }, [activeMarket.code, scrollSequence.length]);

  useEffect(() => {
    if (isPaused || prefersReducedMotion || scrollSequence.length <= 1) return;

    const id = window.setInterval(() => {
      setActiveIndex((currentIndex) => {
        const nextIndex = (currentIndex + 1) % scrollSequence.length;
        const rail = railRef.current;
        if (rail) scrollRailTo(rail, nextIndex * rail.clientWidth, true);
        return nextIndex;
      });
    }, STEP_MS);

    return () => clearInterval(id);
  }, [isPaused, prefersReducedMotion, scrollSequence.length]);

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

  const handleToggleFavorite = async (
    e: React.MouseEvent,
    listingId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const isFav = await listingRepository.toggleFavorite(listingId);
    setFavorites((prev) =>
      isFav ? [...prev, listingId] : prev.filter((id) => id !== listingId),
    );
  };

  /* A newly opened market may have no eligible featured listing. Collapsing
     the gallery avoids leaving an empty media well beside the hero copy. */
  if (scrollSequence.length === 0) return null;

  return (
    <section
      className="relative flex w-full max-w-full flex-1 flex-col justify-between"
      aria-label={t("home.heroBoostedScroll.carouselLabel")}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      {/* The slide titles are `h3`, so the homepage outline went h1 -> h3 with
          nothing in between. Hidden visually — the rail is self-evident. */}
      <h2 className="sr-only">{t("home.heroBoostedScroll.carouselLabel")}</h2>

      <div className="relative overflow-hidden rounded-card shadow-sm">
        <div
          id="hero-boosted-track"
          ref={railRef}
          className="flex aspect-video w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none"
          aria-label={t("home.heroBoostedScroll.carouselLabel")}
          onScroll={handleScroll}
        >
          {scrollSequence.map((item, index) =>
            renderItemCard(item, index, isFeaturedListing(item)),
          )}
        </div>

        {scrollSequence.length > 1 && (
          <>
            <IconButton
              variant="ghost"
              size="md"
              ariaLabel={t("home.heroBoostedScroll.previous")}
              aria-controls="hero-boosted-track"
              onClick={() => scrollToIndex(activeIndex - 1)}
              /* Hidden on phones: the card is short enough there that a
                 vertically centred arrow lands on top of the title overlay, and
                 the rail already swipes. */
              className="absolute left-3 top-1/2 z-raised hidden -translate-y-1/2 rounded-full bg-stone-950/55 text-white shadow-sm backdrop-blur-xs hover:bg-stone-950/75 hover:text-white sm:inline-flex"
            >
              <ChevronLeft className="h-icon-lg w-icon-lg" />
            </IconButton>
            <IconButton
              variant="ghost"
              size="md"
              ariaLabel={t("home.heroBoostedScroll.next")}
              aria-controls="hero-boosted-track"
              onClick={() => scrollToIndex(activeIndex + 1)}
              className="absolute right-3 top-1/2 z-raised hidden -translate-y-1/2 rounded-full bg-stone-950/55 text-white shadow-sm backdrop-blur-xs hover:bg-stone-950/75 hover:text-white sm:inline-flex"
            >
              <ChevronRight className="h-icon-lg w-icon-lg" />
            </IconButton>
          </>
        )}

        <div
          className="absolute bottom-3 right-4 z-raised flex items-center gap-1.5"
          aria-hidden="true"
        >
          {scrollSequence.map((item, index) => (
            <span
              key={item.id}
              className={`h-2 rounded-pill shadow-2xs motion-interactive ${
                index === activeIndex ? "w-4 bg-primary" : "w-2 bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>

      <span className="sr-only" aria-live="polite">
        {activeIndex + 1} / {scrollSequence.length}
      </span>
    </section>
  );

  function renderItemCard(
    item: Listing,
    index: number,
    showFeaturedBadge: boolean,
  ) {
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
          className="absolute inset-0 block focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-focus"
        >
          <Image
            src={photoUrl}
            alt={item.title}
            sizes={IMAGE_SIZES.gallery}
            className="h-full w-full object-cover transition-transform duration-slow group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-4 pb-5 text-white sm:p-5 sm:pb-5 sm:pr-32">
            <p className="mb-1.5 truncate text-micro font-bold uppercase tracking-wider text-orange-200 sm:text-xs">
              {getListingCategoryLabel(item) || "Mode & Accessoires"}
            </p>
            <h3
              title={item.title}
              className="line-clamp-2 font-display text-base font-bold leading-snug sm:text-lg"
            >
              {item.title}
            </h3>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-extrabold sm:text-lg">
                  {formatPrice(item.price)}
                </span>
                {item.originalPrice && item.originalPrice > item.price && (
                  <span className="text-xs font-medium text-white/70 line-through sm:text-sm">
                    {formatPrice(item.originalPrice)}
                  </span>
                )}
              </div>

              <span className="inline-flex items-center gap-1 truncate text-xs font-medium text-white/85 sm:text-sm">
                <MapPin className="h-icon-sm w-icon-sm shrink-0" />
                {item.city || "Lyon 2e"}
              </span>
              {item.deliveryOptions?.some(
                (o) => o.available && o.type !== "hand_delivery",
              ) && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-white/85 sm:text-sm">
                  <Truck className="h-icon-sm w-icon-sm" />
                  {t("home.heroBoostedScroll.livraison")}
                </span>
              )}
            </div>
          </div>
        </Link>

        {showFeaturedBadge && (
          <Badge
            variant="featured"
            size="sm"
            icon
            className="pointer-events-none absolute left-4 top-4 z-raised px-1.5 shadow-sm"
          >
            <span className="sr-only">{t("ui.listingCard.annonceALaUne")}</span>
          </Badge>
        )}

        <FavoriteButton
          isFavorite={isFav}
          onToggle={(e) => handleToggleFavorite(e, item.id)}
          size="lg"
          variant="floating"
          className="absolute right-4 top-4 z-raised"
        />
      </article>
    );
  }
};
