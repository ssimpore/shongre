import { isProSeller } from '../../domains/user/user.domain';
import React, { useState } from 'react';
import { FavoriteButton } from './FavoriteButton';
import { Heart, MapPin, Truck, ShieldCheck, Camera, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Listing } from '../../types';
import { formatRelativeDate, formatRelativeTimestamp } from '../../utilities/formatters';
import { PriceDisplay } from './UIComponents';
import { Badge } from './Badge';
import { Image } from './Image';
import { IMAGE_SIZES } from './responsiveImage';
import { useFavorites } from '../../app/providers/FavoritesProvider';

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

  const summarySnippets = React.useMemo(() => {
    if (!listing.attributes) return [];
    const snippets: string[] = [];
    const attrs = listing.attributes;

    if (attrs.year) snippets.push(`${attrs.year}`);
    if (attrs.mileage) snippets.push(`${Number(attrs.mileage).toLocaleString('fr-FR')} km`);
    if (attrs.fuel) snippets.push(`${attrs.fuel}`);
    if (attrs.surface) snippets.push(`${attrs.surface} m²`);
    if (attrs.rooms) snippets.push(`${attrs.rooms} p.`);
    if (attrs.storage_capacity) snippets.push(`${attrs.storage_capacity.replace('_', ' ').toUpperCase()}`);
    if (attrs.clothing_size) snippets.push(`Taille ${attrs.clothing_size.toUpperCase()}`);
    if (attrs.shoe_size) snippets.push(`Pointure ${attrs.shoe_size}`);

    return snippets.slice(0, 3);
  }, [listing.attributes]);

  const hasDelivery = listing.deliveryOptions.some((d) => d.available && d.type !== 'hand_delivery');

  
  if (variant === 'compact') {
    return (
      <article
        className={`group bg-white rounded-2xl border border-border-base hover:border-primary/40 hover:shadow-md transition-all duration-normal overflow-hidden flex flex-col p-2 ${
          listing.isBoosted ? 'ring-1 ring-primary/30' : ''
        } ${className}`}
      >
        <div className="relative aspect-square w-full bg-stone-100 overflow-hidden rounded-xl">
          <Link to={`/annonce/${listing.id}`} className="block w-full h-full">
            <Image
              src={listing.coverImageUrl}
              alt={listing.title}
              sizes={IMAGE_SIZES.compact}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-normal"
            />
          </Link>
          {/* Tags */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
            {listing.isBoosted && (
              <Badge variant="featured" size="sm" icon className="px-1.5">
                <span className="sr-only">Annonce à la une</span>
              </Badge>
            )}
          </div>
        </div>
        <div className="px-1 pt-2 pb-1 flex-1 flex flex-col justify-between gap-1">
          <Link to={`/annonce/${listing.id}`} className="block">
            <h3 title={listing.title} className="text-xs font-bold text-stone-900 line-clamp-1 group-hover:text-primary transition-colors">
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
    return (
      <article
        className={`group bg-white rounded-card border border-stone-200 hover:border-stone-300 hover:shadow-lg transition-all duration-normal overflow-hidden flex flex-col sm:flex-row p-3 ${
          listing.isBoosted ? 'ring-2 ring-primary/20' : ''
        } ${className}`}
      >
        <Link to={`/annonce/${listing.id}`} className="relative w-full sm:w-[220px] h-48 sm:h-full min-h-[160px] rounded-xl overflow-hidden shrink-0 bg-stone-100 block mr-0 sm:mr-4 mb-3 sm:mb-0">
          <Image
            src={listing.coverImageUrl}
            alt={listing.title}
            sizes={IMAGE_SIZES.thumbnail}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow ease-out-soft"
          />
          {listing.photos.length > 1 && (
            <span className="absolute bottom-2 left-2 bg-stone-900/70 text-white text-xs px-2 py-1 rounded backdrop-blur-xs flex items-center gap-1">
              <Camera className="w-3 h-3" />
              {listing.photos.length}
            </span>
          )}
          {listing.isBoosted && (
            <Badge variant="featured" size="sm" icon className="absolute top-2 left-2">
              Vedette
            </Badge>
          )}
        </Link>

        <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-stone-500">{listing.categoryLabel}</span>
                <Link
                  to={isProSeller(listing) ? `/boutique/${listing.sellerId}` : `/profil/${listing.sellerId}`}
                  className="inline-flex items-center hover:opacity-80 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isProSeller(listing) ? (
                    <Badge variant="pro" size="sm">Pro • {listing.sellerName}</Badge>
                  ) : (
                    <span className="text-xs font-semibold text-stone-600 hover:text-primary hover:underline">
                      {listing.sellerName}
                    </span>
                  )}
                </Link>

                {/* Rating & Review Count */}
                {listing.sellerRating > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-stone-700 bg-bg-base px-2 py-1 rounded border border-border-base">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{listing.sellerRating.toFixed(1)}</span>
                    {listing.sellerReviewCount > 0 && (
                      <span className="text-stone-500 font-normal">({listing.sellerReviewCount})</span>
                    )}
                  </span>
                )}

                {listing.originalPrice && listing.originalPrice > listing.price && (
                  <Badge variant="deal" size="sm">Bon plan</Badge>
                )}
              </div>
              <FavoriteButton
                isFavorite={isFavorite}
                onToggle={handleFavoriteClick}
                size="lg"
              />
            </div>

            <Link to={`/annonce/${listing.id}`} className="block">
              <h3 title={listing.title} className="text-base font-bold text-stone-900 line-clamp-2 group-hover:text-primary transition-colors">
                {listing.title}
              </h3>
            </Link>

            {summarySnippets.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {summarySnippets.map((snippet, idx) => (
                  <span
                    key={idx}
                    className="text-micro font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md"
                  >
                    {snippet}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-2">
              <PriceDisplay
                price={listing.price}
                originalPrice={listing.originalPrice}
                isNegotiable={listing.isNegotiable}
                isFreeDonation={listing.isFreeDonation}
                size="md"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-border-subtle mt-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                {listing.city} ({listing.postalCode.slice(0, 2)})
              </span>
              {hasDelivery && (
                <span className="flex items-center gap-1 text-success font-medium">
                  <Truck className="w-3.5 h-3.5" />
                  Livraison possible
                </span>
              )}
            </div>
            <span>{formatRelativeDate(listing.createdAt)}</span>
          </div>
        </div>
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
      className={`group h-full bg-white rounded-card border border-stone-200 hover:border-stone-300 hover:shadow-xl transition-all duration-normal overflow-hidden flex flex-col p-2 ${
        listing.isBoosted ? 'ring-2 ring-primary/20' : ''
      } ${className}`}
    >
      <div className="relative aspect-[4/3] w-full bg-stone-100 overflow-hidden rounded-2xl shrink-0">
        <Link to={`/annonce/${listing.id}`} className="block w-full h-full">
          <Image
            src={listing.coverImageUrl}
            alt={listing.title}
            sizes={IMAGE_SIZES.card}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow ease-out-soft"
          />
        </Link>

        {/* Favorite Button */}
        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={handleFavoriteClick}
          size="lg"
          variant="floating"
          className="absolute top-2.5 right-2.5 z-10"
        />

        {/* Tags / Badges — one controlled slot, at most two states, so cards
            never accumulate a wall of labels. */}
        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1 z-10 pointer-events-none">
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
          <span className="absolute bottom-2 left-2 bg-stone-900/70 text-white text-micro px-2 py-1 rounded backdrop-blur-xs flex items-center gap-1 pointer-events-none">
            <Camera className="w-2.5 h-2.5" />
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
                {listing.categoryLabel}
                {' • '}
              </span>
              <Link
                to={isProSeller(listing) ? `/boutique/${listing.sellerId}` : `/profil/${listing.sellerId}`}
                className="hover:opacity-80 transition-opacity"
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
              <span className="inline-flex items-center gap-0.5 text-micro font-semibold text-stone-700 bg-bg-base px-2 py-1 rounded border border-border-base/80 shrink-0">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
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
              exact across the `text-sm` → `text-[15px]` step, which a rem
              value cannot do. */}
          <Link to={`/annonce/${listing.id}`} className="block mb-2.5">
            <h3
              title={listing.title}
              className="text-sm sm:text-[15px] font-bold text-stone-900 line-clamp-2 min-h-[2.8em] group-hover:text-primary transition-colors leading-[1.4]"
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
