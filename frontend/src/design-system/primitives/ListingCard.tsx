import { isProSeller } from '../../domains/user/user.domain';
import React, { useState } from 'react';
import { FavoriteButton } from './FavoriteButton';
import { Heart, MapPin, Truck, ShieldCheck, Camera, Sparkles, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Listing } from '../../types';
import { formatRelativeDate } from '../../utilities/formatters';
import { PriceDisplay } from './UIComponents';
import { Badge } from './Badge';
import { Image } from './Image';
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
        className={`group bg-white rounded-2xl border border-border-base hover:border-primary/40 hover:shadow-md transition-all duration-normal overflow-hidden flex flex-col ${
          listing.isBoosted ? 'ring-1 ring-primary/30' : ''
        } ${className}`}
      >
        <div className="relative aspect-square w-full bg-stone-100 overflow-hidden">
          <Link to={`/annonce/${listing.id}`} className="block w-full h-full">
            <Image
              src={listing.coverImageUrl}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-normal"
            />
          </Link>
          {/* Tags */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
            {listing.isBoosted && (
              <span className="bg-primary text-white px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span className="sr-only">Annonce à la une</span>
              </span>
            )}
          </div>
        </div>
        <div className="p-3 flex-1 flex flex-col justify-between gap-1">
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
        className={`group bg-white rounded-2xl border border-border-base hover:border-primary/40 hover:shadow-md transition-all duration-normal overflow-hidden flex flex-col sm:flex-row gap-4 p-3 ${
          listing.isBoosted ? 'ring-1 ring-primary/30' : ''
        } ${className}`}
      >
        <Link to={`/annonce/${listing.id}`} className="relative w-full sm:w-56 h-44 sm:h-auto rounded-lg overflow-hidden shrink-0 bg-stone-100 block">
          <Image
            src={listing.coverImageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-normal"
          />
          {listing.photos.length > 1 && (
            <span className="absolute bottom-2 left-2 bg-stone-900/70 text-white text-xs px-2 py-1 rounded backdrop-blur-xs flex items-center gap-1">
              <Camera className="w-3 h-3" />
              {listing.photos.length}
            </span>
          )}
          {listing.isBoosted && (
            <span className="absolute top-2 left-2 bg-primary text-white text-micro font-bold uppercase tracking-wider px-2 py-1 rounded shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Vedette
            </span>
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
    <article
      className={`group bg-white rounded-2xl border border-border-base hover:border-primary/40 hover:shadow-md transition-all duration-normal overflow-hidden flex flex-col ${
        listing.isBoosted ? 'ring-1 ring-primary/30' : ''
      } ${className}`}
    >
      <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
        <Link to={`/annonce/${listing.id}`} className="block w-full h-full">
          <Image
            src={listing.coverImageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-normal"
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
            <span className="bg-primary text-white text-micro font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Vedette
            </span>
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

      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Meta row: category · seller, with the rating pinned right.
              This used to be `flex-wrap`, so a long seller name pushed the rating
              badge onto a second line — which made the meta row taller on some
              cards than others and knocked the titles and prices out of
              alignment across a row. One line, always: the left group truncates,
              the badge never shrinks. */}
          <div className="flex items-center gap-1.5 mb-1.5 justify-between">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-xs font-semibold text-stone-500 truncate">{listing.categoryLabel}</span>
              <Link
                to={isProSeller(listing) ? `/boutique/${listing.sellerId}` : `/profil/${listing.sellerId}`}
                className="inline-flex items-center hover:opacity-80 transition-opacity truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {isProSeller(listing) ? (
                  <Badge variant="pro" size="sm">Pro</Badge>
                ) : (
                  <span className="text-micro text-stone-500 hover:text-primary truncate">
                    • {listing.sellerName}
                  </span>
                )}
              </Link>
            </div>

            {/* Rating / Review Badge */}
            {listing.sellerRating > 0 && (
              <span className="inline-flex items-center gap-0.5 text-micro font-semibold text-stone-700 bg-bg-base px-2 py-1 rounded border border-border-base/80 shrink-0">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                <span>{listing.sellerRating.toFixed(1)}</span>
                {listing.sellerReviewCount > 0 && (
                  <span className="text-stone-500 font-normal">({listing.sellerReviewCount})</span>
                )}
              </span>
            )}
          </div>

          {/* Reserves both lines whether or not the title needs them, so the
              price sits at the same height on every card in a row. */}
          <Link to={`/annonce/${listing.id}`} className="block mb-2">
            <h3
              title={listing.title}
              className="text-sm font-bold text-stone-900 line-clamp-2 min-h-[2.625rem] group-hover:text-primary transition-colors leading-snug"
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

        <div className="pt-3 border-t border-border-subtle mt-3 flex items-center justify-between text-xs text-stone-500">
          <span className="flex items-center gap-1 truncate max-w-[120px]">
            <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
            {listing.city}
          </span>
          <span className="shrink-0">{formatRelativeDate(listing.createdAt)}</span>
        </div>
      </div>
    </article>
  );
};
