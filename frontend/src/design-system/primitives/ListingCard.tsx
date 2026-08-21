import { isProSeller } from '../../domains/user/user.domain';
import React, { } from 'react';
import { FavoriteButton } from './FavoriteButton';
import {  MapPin, Truck,  Camera, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Listing } from '../../types';
import { formatRelativeDate, formatRelativeTimestamp } from '../../utilities/formatters';
import { PriceDisplay } from '../components/Price';
import { Badge } from './Badge';
import { Image } from './Image';
import { IMAGE_SIZES } from './responsiveImage';
import { useFavorites } from '../../app/providers/FavoritesProvider';
import { useTranslation } from '../../i18n/I18nProvider';
import { CONTROL_FOCUS_CLASS, CONTROL_MOTION_CLASS } from '../utils/controlMetrics';
import { getListingCategoryLabel } from '../../domains/taxonomy/taxonomy.display';

export interface ListingCardProps {
  listing: Listing;
  variant?: 'grid' | 'list' | 'compact';
  className?: string;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  variant = 'grid',
  className = '',
}) => {
  const { t } = useTranslation();
  // Read from the shared store rather than keeping per-card state: two cards
  // showing the same listing (a rail and the grid below it) used to disagree
  // after a toggle, and the header badge never heard about it at all.
  const { isFavorite: isListingFavorite, toggleFavorite } = useFavorites();
  const isFavorite = isListingFavorite(listing.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void toggleFavorite(listing.id);
  };


  const hasDelivery = listing.deliveryOptions.some((d) => d.available && d.type !== 'hand_delivery');
  const displayCategoryLabel = getListingCategoryLabel(listing);

  
  if (variant === 'compact') {
    return (
      <article
        className={`group bg-bg-surface rounded-card border border-border-base hover:border-primary/40 hover:shadow-md focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 ${CONTROL_MOTION_CLASS} overflow-hidden flex flex-col p-2 ${
          listing.isBoosted ? 'ring-1 ring-primary/30' : ''
        } ${className}`}
      >
        <div className="relative aspect-square w-full bg-bg-muted overflow-hidden rounded-control">
          <Link to={`/annonce/${listing.id}`} className={`block w-full h-full ${CONTROL_FOCUS_CLASS}`}>
            <Image
              src={listing.coverImageUrl}
              alt={listing.title}
              sizes={IMAGE_SIZES.compact}
              className="w-full h-full object-cover group-hover:scale-105 motion-surface"
            />
          </Link>
          {/* Tags */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-raised pointer-events-none">
            {listing.isBoosted && (
              <Badge variant="featured" size="sm" icon className="px-1.5">
                <span className="sr-only">{t('ui.listingCard.annonceALaUne')}</span>
              </Badge>
            )}
          </div>
        </div>
        <div className="px-1 pt-2 pb-1 flex-1 flex flex-col justify-between gap-1">
          <Link to={`/annonce/${listing.id}`} className={`block ${CONTROL_FOCUS_CLASS}`}>
            <h3 title={listing.title} className={`text-xs font-bold text-stone-900 line-clamp-1 group-hover:text-primary ${CONTROL_MOTION_CLASS}`}>
              {listing.title}
            </h3>
          </Link>
          <div className="flex items-center justify-between gap-2 mt-1">
            <PriceDisplay
              price={listing.price}
              isFreeDonation={listing.isFreeDonation}
              size="sm"
            />
            <span className="text-micro text-stone-500 shrink-0">
              {formatRelativeDate(listing.createdAt)}
            </span>
          </div>
        </div>
      </article>
    );
  }

  if (variant === 'list') {
    /* The compact horizontal row, matching the hero rail's card.
     *
     * It used to carry the seller name, the rating chip, a "Bon plan" badge, the
     * attribute snippets and a bordered metadata footer — a stack tall enough
     * that three rows filled a phone screen, which is the opposite of what a
     * list view is for. The struck-through original price still marks a deal,
     * and the seller is one tap away on the listing itself.
     *
     * The favourite control is a sibling of the links rather than inside one:
     * `<a>` may not contain interactive content, and nesting it gives screen
     * readers two overlapping controls for one card.
     */
    return (
      <article
        /* On a phone the row is as tall as a grid card is wide: the list holds
           one card per row where the grid holds two, so `aspect-[2/1]` on the
           full-width row resolves to half the row — the same measurement the
           grid gives each of its columns, give or take the 12px gutter it does
           not have to pay. From `sm` the grid moves to three and four columns
           and that relationship stops meaning anything, so the row goes back to
           sizing from its content. */
        className={`group relative bg-bg-surface rounded-card border border-border-base hover:border-border-hover hover:shadow-md focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 ${CONTROL_MOTION_CLASS} overflow-hidden flex flex-row gap-3 p-2 aspect-[2/1] sm:aspect-auto ${
          listing.isBoosted ? 'ring-2 ring-primary/20' : ''
        } ${className}`}
      >
        <Link
          to={`/annonce/${listing.id}`}
          className={`relative h-full w-auto aspect-square sm:h-auto sm:w-32 rounded-control overflow-hidden shrink-0 bg-bg-muted block ${CONTROL_FOCUS_CLASS}`}
        >
          <Image
            src={listing.coverImageUrl}
            alt={listing.title}
            sizes={IMAGE_SIZES.compact}
            className="w-full h-full object-cover group-hover:scale-105 motion-surface"
          />
          {listing.isBoosted && (
            <Badge variant="featured" size="sm" icon className="absolute top-1.5 left-1.5 px-1.5">
              <span className="sr-only">{t('ui.listingCard.annonceALaUne')}</span>
            </Badge>
          )}
        </Link>

        {/* Centred, not spread. `justify-between` pushed the title to the top
            edge and the price to the bottom of a 172px row, leaving a void down
            the middle — fine when the row was 115px, wrong once it matches a
            grid card's width. */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 py-0.5">
          <div className="min-w-0">
            {/* `pr-8` keeps both lines clear of the favourite control above. */}
            <span className="block text-micro font-bold uppercase tracking-wider text-primary truncate pr-8 mb-0.5">
              {displayCategoryLabel}
            </span>
            <Link to={`/annonce/${listing.id}`} className={`block ${CONTROL_FOCUS_CLASS}`}>
              <h3
                title={listing.title}
                className={`text-xs sm:text-sm font-bold text-stone-900 line-clamp-2 leading-snug pr-8 group-hover:text-primary ${CONTROL_MOTION_CLASS}`}
              >
                {listing.title}
              </h3>
            </Link>
          </div>

          <div className="min-w-0 mt-1">
            <PriceDisplay
              price={listing.price}
              originalPrice={listing.originalPrice}
              isNegotiable={listing.isNegotiable}
              isFreeDonation={listing.isFreeDonation}
              size="sm"
            />
            {/* Short delivery wording, and the row wraps. "Livraison possible"
                is wide enough that the city — the more useful of the two — was
                crushed to "Ly…" and "N…" beside it. */}
            <div className="flex items-center gap-x-2.5 gap-y-0.5 flex-wrap mt-0.5 text-micro text-stone-500 min-w-0">
              <span className="flex items-center gap-1 font-medium min-w-0">
                <MapPin className="w-3 h-3 shrink-0 text-stone-400" />
                <span className="truncate">{listing.city}</span>
              </span>
              {hasDelivery && (
                <span className="inline-flex items-center gap-1 font-medium shrink-0">
                  <Truck className="w-3 h-3 text-stone-400" />
                  {t('ui.listingCard.livraisonCourt')}
                </span>
              )}
            </div>
          </div>
        </div>

        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={handleFavoriteClick}
          size="md"
          variant="floating"
          className="absolute top-2.5 right-2.5 z-raised"
        />
      </article>
    );
  }

  // Default Grid Variant
  return (
    /* `h-full` makes the card fill its grid or flex cell instead of collapsing
       to its own content. A row of cards is only as consistent as its shortest
       one otherwise: a listing carrying a "Négociable" chip or a struck-through
       original price is two rows taller than one that is not, and the cards
       ended a visible 27px apart down the row. Filling the cell hands the extra
       height to the card, where `justify-between` below pushes the city/date
       footer to the bottom edge — so the footers line up across the row too,
       not just the outlines. */
    <article
      className={`group h-full bg-bg-surface rounded-card border border-border-base hover:border-border-hover hover:shadow-lg focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 ${CONTROL_MOTION_CLASS} overflow-hidden flex flex-col p-2 ${
        listing.isBoosted ? 'ring-2 ring-primary/20' : ''
      } ${className}`}
    >
      <div className="relative aspect-[4/3] w-full bg-bg-muted overflow-hidden rounded-control shrink-0">
        <Link to={`/annonce/${listing.id}`} className={`block w-full h-full ${CONTROL_FOCUS_CLASS}`}>
          <Image
            src={listing.coverImageUrl}
            alt={listing.title}
            sizes={IMAGE_SIZES.card}
            className="w-full h-full object-cover group-hover:scale-105 motion-surface"
          />
        </Link>

        {/* Favorite Button */}
        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={handleFavoriteClick}
          size="lg"
          variant="floating"
          className="absolute top-2.5 right-2.5 z-raised"
        />

        {/* Tags / Badges — one controlled slot, at most two states, so cards
            never accumulate a wall of labels. */}
        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1 z-raised pointer-events-none">
          {listing.isBoosted && (
            <Badge variant="featured" size="sm" icon>
              Vedette
            </Badge>
          )}
          {listing.originalPrice && listing.originalPrice > listing.price && (
            <Badge variant="deal" size="sm" className="shadow-sm">
              Bon plan
            </Badge>
          )}
        </div>

        {/* Photos count */}
        {listing.photos.length > 1 && (
          <span
            aria-label={t('ui.listingCard.nombrePhotos', { count: listing.photos.length })}
            className="absolute bottom-2 left-2 flex items-center gap-1 rounded-control bg-stone-900/70 px-2 py-1 text-micro text-white backdrop-blur-xs pointer-events-none"
          >
            <Camera className="w-2.5 h-2.5" aria-hidden="true" />
            {listing.photos.length}
          </span>
        )}
      </div>

      <div className="px-2 pt-3 pb-2 flex-1 flex flex-col justify-between">
        <div>
          {/* Meta row: category · seller, with the rating pinned right.
              This used to be `flex-wrap`, so a long seller name pushed the rating
              badge onto a second line — which made the meta row taller on some
              cards than others and knocked the titles and prices out of
              alignment across a row. One line, always: the left group truncates,
              the badge never shrinks. */}
          <div className="flex items-center gap-1.5 mb-1.5 justify-between">
            {/* Category and seller share one truncating line rather than being
                two flex children that each clip on their own.

                As separate children they competed: in a 2-up grid on a phone
                they split the ~73px left after the rating badge and both
                collapsed to a single letter ("S… • C…"), and once the category
                was pinned with `shrink-0` to stop that, the pair stopped
                yielding at all and ran underneath the badge in the narrower
                cards of the deals grid. One line ends both failure modes: the
                text fills what is available and ellipsises once at the end, so
                it reads "Véhicules • Thomas L…" and can never reach the badge.
                The category still stands down below `sm`, where the photo and
                title already imply it and the seller is the signal worth the
                space. */}
            <div className="min-w-0 flex-1 truncate text-xs text-stone-500">
              <span className="hidden sm:inline font-semibold">
                {displayCategoryLabel}
                {' • '}
              </span>
              <Link
                to={isProSeller(listing) ? `/boutique/${listing.sellerId}` : `/profil/${listing.sellerId}`}
                /* The row is 14px tall by design — it is dense metadata. The
                   *link* still has to clear 24px (WCAG 2.5.8), so the target is
                   grown vertically with padding and pulled back with a negative
                   margin, leaving the row's visual height untouched. */
                className={`inline-flex items-center min-h-6 -my-1 py-1 hover:opacity-80 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS}`}
                onClick={(e) => e.stopPropagation()}
              >
                {isProSeller(listing) ? (
                  <Badge variant="pro" size="sm">Pro</Badge>
                ) : (
                  <span className="text-micro hover:text-primary">{listing.sellerName}</span>
                )}
              </Link>
            </div>

            {/* Rating / Review Badge. The review count is the least load-bearing
                token in the row, so it stands down on phones to buy the seller
                name back its space; the score itself always stays. */}
            {listing.sellerRating > 0 && (
              <span
                aria-label={t('ui.listingCard.noteAvis', {
                  rating: listing.sellerRating.toFixed(1),
                  count: listing.sellerReviewCount,
                })}
                className="inline-flex items-center gap-0.5 rounded-control border border-border-base/80 bg-bg-base px-2 py-1 text-micro font-semibold text-stone-700 shrink-0"
              >
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                <span>{listing.sellerRating.toFixed(1)}</span>
                {listing.sellerReviewCount > 0 && (
                  <span className="hidden sm:inline text-stone-500 font-normal">
                    ({listing.sellerReviewCount})
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Reserves both lines whether or not the title needs them, so the
              price sits at the same height on every card in a row.

              The reservation is `2.8em` — exactly the two clamped lines at
              `leading-[1.4]` — and not a fixed rem. A hard `2.75rem` was 44px
              against a 39.2px clamp, so the box was 2.24 line-heights tall and
              the extra quarter-line painted the sliced top of line three under
              the ellipsis on every card. An em-based reservation also stays
              exact across the `text-sm` → `text-card-title` step, which a rem
              value cannot do. */}
          <Link to={`/annonce/${listing.id}`} className={`block mb-2.5 ${CONTROL_FOCUS_CLASS}`}>
            <h3
              title={listing.title}
              className={`text-sm sm:text-card-title font-bold text-stone-900 line-clamp-2 min-h-[2.8em] group-hover:text-primary ${CONTROL_MOTION_CLASS} leading-snug`}
            >
              {listing.title}
            </h3>
          </Link>

          <PriceDisplay
            price={listing.price}
            originalPrice={listing.originalPrice}
            isNegotiable={listing.isNegotiable}
            isFreeDonation={listing.isFreeDonation}
            size="md"
          />
        </div>

        {/* `gap-2` is load-bearing: `justify-between` alone lets the city and
            the date meet with no space once a 2-up grid on a phone leaves the
            row ~145px, so "Bordeaux" and "Il y a 2 jours" ran together into
            "Bordeaull y a 2 jours". The city now truncates against the gap
            instead of colliding with the date. */}
        <div className="pt-3 border-t border-border-subtle mt-3 flex items-center justify-between gap-2 text-xs text-stone-500">
          <span className="flex items-center gap-1 min-w-0 truncate">
            <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
            <span className="truncate">{listing.city}</span>
          </span>
          {/* "Il y a 2 jours" is 85px of a ~145px footer in a 2-up grid on a
              phone, which left the city truncated to "Lyon …" on a marketplace
              where the location is half the decision. The abbreviated form
              gives that width back; the full wording returns at `sm`. */}
          <span className="shrink-0 sm:hidden">
            {formatRelativeTimestamp(listing.createdAt, { style: 'short' })}
          </span>
          <span className="shrink-0 hidden sm:inline">
            {formatRelativeDate(listing.createdAt)}
          </span>
        </div>
      </div>
    </article>
  );
};
