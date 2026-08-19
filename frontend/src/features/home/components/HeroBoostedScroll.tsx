import { isProSeller } from '../../../domains/user/user.domain';
import { routes } from '../../../configuration/routes';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Sparkle,
  ChevronRight,
  MapPin,
  Truck,
  Heart,
  Play,
  Pause,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  Filter,
  Star,
  Check,
} from 'lucide-react';
import { Listing } from '../../../types';
import { FavoriteButton } from '../../../design-system/primitives/FavoriteButton';
import { listingRepository } from '../../../repositories/listing.repository';
import { taxonomyService, getTaxonomyLabel } from '../../../domains/taxonomy/taxonomy.service';
import { PriceDisplay } from '../../../design-system/primitives/UIComponents';
import { Badge } from '../../../design-system/primitives/Badge';
import { Image } from '../../../design-system/primitives/Image';
import { IMAGE_SIZES } from '../../../design-system/primitives/responsiveImage';
import { CategoryIcon } from '../../../design-system/primitives/CategoryIcon';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

/* Rail geometry. The viewport height, the step distance and the card's own
   height are all derived from these, so a card can never end up half-visible. */
const RAIL_CARD_H = 132;  // px — calibrated height filling container without overflow
const RAIL_GAP = 14;      // px — matches gap-3.5
/* The horizontal mobile marquee needs a taller row than the desktop rail: the
   favourite control is 44px there rather than 32 (WCAG 2.5.5 on coarse
   pointers), and that difference alone pushed the location/delivery line past
   the row's `overflow-hidden` edge. Only the vertical rail's step maths depends
   on RAIL_CARD_H, so the mobile height is free to differ. */
const RAIL_CARD_MOBILE_H = 168;
const VISIBLE = 2;        // exactly 2 listings on screen at once to automatically fill the container

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
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  // Close category dropdown on Escape or click outside
  useEffect(() => {
    if (!isCategoryMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCategoryMenuOpen(false);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isCategoryMenuOpen]);

  useEffect(() => {
    listingRepository.getListings({ limit: 50 }).then((res) => {
      setAllListings(res.listings || []);
    }).catch(() => {
      setAllListings([]);
    });

    listingRepository.getFavorites().then((favs) => {
      setFavorites(favs.map((f) => f.id));
    }).catch(() => {
      setFavorites([]);
    });
  }, []);

  // Load boosted, pro, and featured listings
  const promotedListings = useMemo(() => {
    const active = allListings.filter((l) => l && l.status === 'active');
    
    // Sort so boosted listings, deals, and pro sellers are prioritized
    const sorted = [...active].sort((a, b) => {
      const scoreA = (a?.isBoosted ? 3 : 0) + (isProSeller(a) ? 2 : 0) + (a?.originalPrice ? 1 : 0);
      const scoreB = (b?.isBoosted ? 3 : 0) + (isProSeller(b) ? 2 : 0) + (b?.originalPrice ? 1 : 0);
      return scoreB - scoreA;
    });

    if (activeCategory === 'all') {
      return sorted;
    }
    return sorted.filter((l) => l?.categorySlug === activeCategory);
  }, [allListings, activeCategory]);

  const scrollSequence = useMemo(() => {
    const fallbackList = allListings.filter((l) => l && l.status === 'active').slice(0, 8);
    const list = promotedListings.length > 0 ? promotedListings : fallbackList;
    if (!list || list.length === 0) return [];

    let res = [...list];
    while (res.length < 5) {
      res = [...res, ...list];
    }
    return res;
  }, [promotedListings, allListings]);

  const isDesktopRail = useMediaQuery('(min-width: 640px)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------------------
     Stepped auto-scroll.

     The rail previously carried `animate-marquee-vertical`, a class that does not
     exist — only `-up`, `-up-slow` and `-down` are defined — so the desktop rail
     never actually moved. Rather than restore a continuous marquee, this advances
     one card at a time on a timer, which is easier to read: a card holds still
     long enough to be taken in, then the list steps.

     The track renders the list plus a clone of the first `VISIBLE` cards, so the
     final step slides into a copy of the start and then resets without a
     transition — the loop has no visible jump.
     ------------------------------------------------------------------------ */
  const STEP_MS = 3200;
  const [step, setStep] = useState(0);
  const [animate, setAnimate] = useState(true);

  const loopItems = useMemo(
    () => (scrollSequence.length ? [...scrollSequence, ...scrollSequence.slice(0, VISIBLE)] : []),
    [scrollSequence]
  );

  useEffect(() => {
    setStep(0);
  }, [activeCategory, scrollSequence.length]);

  useEffect(() => {
    if (!isDesktopRail || isPaused || prefersReducedMotion) return;
    if (scrollSequence.length <= VISIBLE) return;
    const id = setInterval(() => setStep((s) => s + 1), STEP_MS);
    return () => clearInterval(id);
  }, [isDesktopRail, isPaused, prefersReducedMotion, scrollSequence.length]);

  // Reaching the cloned tail means we are visually at the start again: drop the
  // transition, snap back to 0, then restore it on the next frame.
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

  const categories = useMemo(() => {
    const roots = taxonomyService.getRootCategories();
    return [
      { id: 'all', label: 'Toutes les catégories', rawCategory: undefined },
      ...roots.map((r) => ({
        id: r.slug,
        label: getTaxonomyLabel(r, 'compact'),
        rawCategory: r,
      })),
    ];
  }, []);

  return (
    <section
      className={`relative w-full max-w-full rounded-card bg-bg-surface border border-border-base p-3.5 sm:p-4 shadow-xl shadow-stone-300/30 flex flex-col justify-between overflow-hidden hover-pause ${
        isPaused ? 'pause-animation' : ''
      }`}
      aria-labelledby="hero-boosted-heading"
    >
      {/* Top Header with integrated Category Dropdown & Controls */}
      <div className="shrink-0">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-primary-light border border-primary-border shrink-0">
              <Sparkle className="w-3.5 h-3.5 fill-primary text-primary" />
              <h2 id="hero-boosted-heading" className="text-micro sm:text-xs font-bold text-primary">
                Vedettes
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-success-surface text-success border border-success-border text-micro sm:text-xs font-bold shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              Direct
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Category Filter Dropdown (Harmonized with Header styling) */}
            <div className="relative hidden sm:block" ref={categoryMenuRef}>
              <button
                type="button"
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                aria-expanded={isCategoryMenuOpen}
                aria-haspopup="menu"
                aria-label="Filtrer par catégorie"
                className={`relative p-1.5 rounded-lg border transition-all inline-flex items-center gap-1 cursor-pointer select-none ${
                  activeCategory !== 'all'
                    ? 'bg-primary-light text-primary border-primary-border shadow-xs'
                    : 'border-transparent text-stone-400 hover:text-stone-900 hover:bg-bg-subtle'
                } ${isCategoryMenuOpen ? 'ring-1 ring-primary/40 border-primary text-primary' : ''}`}
                title={
                  activeCategory !== 'all'
                    ? `Filtre actif : ${categories.find((c) => c.id === activeCategory)?.label || activeCategory}`
                    : 'Filtrer par catégorie'
                }
              >
                <Filter className="w-3.5 h-3.5" />
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    isCategoryMenuOpen ? 'rotate-180 text-primary' : 'text-stone-400'
                  }`}
                />
                {activeCategory !== 'all' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary absolute top-1 right-1" />
                )}
              </button>

              {isCategoryMenuOpen && (
                <div
                  role="menu"
                  aria-orientation="vertical"
                  className="absolute right-0 top-full mt-1.5 w-60 max-h-72 overflow-y-auto overscroll-contain bg-white rounded-2xl shadow-xl border border-border-base py-1.5 z-50 animate-in fade-in zoom-in-95"
                >
                  <div className="px-3.5 py-1.5 text-micro font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs">
                    <span>Filtrer par catégorie</span>
                    {activeCategory !== 'all' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCategory('all');
                          setIsCategoryMenuOpen(false);
                        }}
                        className="text-primary hover:underline lowercase font-semibold text-micro cursor-pointer"
                      >
                        Tout effacer
                      </button>
                    )}
                  </div>

                  <div className="py-1">
                    {categories.map((c) => {
                      const isSelected = activeCategory === c.id;
                      const rawCategory = c.rawCategory;
                      return (
                        <button
                          key={c.id}
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setActiveCategory(c.id);
                            setIsCategoryMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2 text-xs transition-colors text-left cursor-pointer ${
                            isSelected
                              ? 'bg-primary-light text-primary font-bold'
                              : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {rawCategory ? (
                              <CategoryIcon category={rawCategory} size="xs" />
                            ) : (
                              <div className="w-4 h-4 rounded-md bg-stone-100 flex items-center justify-center text-stone-600 shrink-0">
                                <Sparkles className="w-2.5 h-2.5" />
                              </div>
                            )}
                            <span className="truncate leading-tight">{c.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1 rounded-lg hover:bg-bg-subtle text-stone-400 hover:text-stone-900 transition-colors min-w-6 min-h-6 inline-flex items-center justify-center pointer-coarse:min-w-control-touch pointer-coarse:min-h-control-touch"
              title={isPaused ? 'Reprendre le défilement' : 'Mettre en pause'}
              aria-label={isPaused ? 'Reprendre le défilement' : 'Mettre en pause'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            <Link
              to={routes.search()}
              className="inline-flex items-center gap-0.5 h-control-sm pl-2.5 sm:pl-3 pr-1.5 sm:pr-2 rounded-full border border-border-base bg-bg-surface hover:bg-bg-subtle hover:border-border-hover text-micro sm:text-xs font-semibold text-stone-700 hover:text-stone-900 transition-colors shrink-0"
            >
              Voir plus
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Track Section.
          The viewport is sized to exactly VISIBLE cards (card height + gap), so
          the rail always shows two whole listings filling the full height of the container.

          That two-card height belongs to the vertical rail only. Below `sm` the
          track is a single-row horizontal marquee, and an unscoped
          `min-h-(--rail-viewport)` was stretching those one-row cards to the
          full 274px — 64px of dead space inside every card on a phone, with the
          title and the price pushed apart to opposite ends of it. */}
      <div
        className="relative mb-3 overflow-hidden w-full max-w-full sm:h-(--rail-viewport) min-h-(--rail-card-mobile-h) sm:min-h-(--rail-viewport) shrink-0"
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
          <div className="flex gap-3.5 animate-marquee-horizontal w-max">
            {scrollSequence.map((item, index) => renderItemCard(item, `horiz-${item.id}-${index}`))}
          </div>
        )}
      </div>

      {/* Reassurance strip. Copy only — the catalogue link moved up to the
          header, so nothing here competes with the listings above it. */}
      <div className="shrink-0 relative overflow-hidden rounded-2xl bg-bg-subtle border border-border-subtle px-3.5 py-2.5">
        <div className="relative z-10">
          <p className="flex items-center gap-2 text-xs font-bold text-stone-900">
            <ShieldCheck className="w-4 h-4 text-success shrink-0" />
            Annonces contrôlées
          </p>
          <p className="text-micro text-stone-500 mt-0.5 ml-6">
            Sécurité, fiabilité et qualité assurées.
          </p>
        </div>
        <ShieldCheck
          aria-hidden="true"
          className="absolute -right-3 -bottom-4 w-20 h-20 text-primary/10 pointer-events-none"
        />
      </div>
    </section>
  );

  function renderItemCard(item: Listing, key: string) {
    const isFav = favorites.includes(item.id);
    const isPro = isProSeller(item);
    const photoUrl = getListingPhotoUrl(item.coverImageUrl || item.photos?.[0]);

    return (
      <Link
        key={key}
        to={`/annonce/${item.id}`}
        /* No border or fill of its own: the rows sit directly on the card, so
           the only chrome between two listings is the gap. Hover tints the row
           instead, which keeps the surface count down. */
        className="group relative flex items-stretch gap-3 sm:gap-4 p-2.5 sm:p-2 sm:-mx-2 rounded-2xl border border-border-subtle bg-bg-surface sm:border-transparent sm:bg-transparent hover:bg-bg-subtle transition-colors duration-normal w-[320px] sm:w-full max-w-full shrink-0 h-(--rail-card-mobile-h) sm:h-(--rail-card-h) overflow-hidden box-border"
      >
        {/* Wrapped rather than positioned directly: FavoriteButton sets
            `relative` on its own root, and Tailwind emits `.relative` after
            `.absolute`, so an `absolute` passed through `className` loses on
            source order no matter where it sits in the attribute. */}
        <span className="absolute top-2.5 right-2.5 sm:top-2 sm:right-2 z-10">
          <FavoriteButton
            isFavorite={isFav}
            onToggle={(e) => handleToggleFavorite(e, item.id)}
            size="md"
            variant="floating"
          />
        </span>

        <div className="relative w-28 sm:w-40 h-full rounded-2xl overflow-hidden shrink-0 bg-bg-muted">
          <Image
            src={photoUrl}
            alt={item.title}
            sizes={IMAGE_SIZES.compact}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-normal"
          />
          {item.isBoosted && (
            /* Icon-only: the rail thumbnail is 112px wide, and the full
               "Vedette" wordmark covered 77% of it — the badge obscured the
               photo the buyer is there to judge. */
            <Badge variant="featured" size="sm" icon className="absolute top-1.5 left-1.5 px-1.5">
              <span className="sr-only">Annonce à la une</span>
            </Badge>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between py-1 overflow-hidden">
          <div className="min-w-0">
            {/* The gutter is on the wrapper, not on the truncating span:
                `overflow: hidden` clips at the padding box, so a long category
                label would render straight through its own `pr-*` and under the
                favourite control. Constraining the width is what actually holds
                it. The wrapped title below is fine with padding — wrapping
                respects the content box. */}
            <div className="pr-11 sm:pr-8 mb-0.5">
              <span className="block text-micro font-bold uppercase tracking-wider text-primary truncate">
                {item.categoryLabel}
              </span>
            </div>

            <h3
              title={item.title}
              className="text-sm font-bold text-stone-900 line-clamp-2 group-hover:text-primary transition-colors leading-snug pr-11 sm:pr-8"
            >
              {item.title}
            </h3>
          </div>

          <div className="min-w-0">
            {/* One price component rather than a hand-rolled pair: it already
                renders the struck-through original at the right weight. */}
            <PriceDisplay price={item.price} originalPrice={item.originalPrice} size="lg" />

            <div className="flex items-center gap-3 mt-1.5 text-micro text-stone-500 flex-wrap">
              <span className="flex items-center gap-1 truncate font-medium">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                {item.city}
              </span>
              {isPro && (
                <span className="inline-flex items-center px-1.5 rounded bg-stone-100 text-stone-800 font-bold text-micro">
                  PRO
                </span>
              )}
              {item.deliveryOptions?.some((o) => o.available && o.type !== 'hand_delivery') && (
                <span className="inline-flex items-center gap-1 text-stone-500 font-medium">
                  <Truck className="w-3.5 h-3.5 text-stone-400" />
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
