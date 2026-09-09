import React from "react";
import type { MarketCode } from "@shongre/contracts";
import type { PropertyPublic } from "@shongre/contracts/real-estate";
import { ListingCardViewCard } from "../../../design-system/primitives/ListingCard";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { presentPropertyListingCard } from "../../../domains/listing/listing-card.presentation";

export const PropertyCard: React.FC<{
  property: PropertyPublic;
  selected?: boolean;
  onSelect?: (property: PropertyPublic) => void;
  onFavorite?: (property: PropertyPublic) => void;
  favoriteState?: boolean;
  favoriteLoadState?: "loading" | "ready" | "error";
  onFavoriteRetry?: () => void | Promise<unknown>;
  compact?: boolean;
  displayVariant?: "grid" | "list";
  /** Set on the first result so its cover is fetched with the page, not after it. */
  imagePriority?: boolean;
}> = ({
  property,
  selected,
  onSelect,
  onFavorite,
  favoriteState,
  favoriteLoadState,
  onFavoriteRetry,
  compact = false,
  displayVariant = "grid",
  imagePriority = false,
}) => {
  const { activeMarket, currentLocale, convertMoney } = useMarketLocation();
  const listing = presentPropertyListingCard(
    property,
    currentLocale,
    activeMarket.code as MarketCode,
    convertMoney,
  );
  const isFavorite = favoriteState ?? property.isFavorite;

  return (
    <div
      className="h-full w-full min-w-0"
      onMouseEnter={() => onSelect?.(property)}
      data-listing-card-consumer="real-estate"
    >
      <ListingCardViewCard
        listing={listing}
        href={`/immo/bien/${property.slug}`}
        imagePriority={imagePriority}
        variant={compact ? "compact" : displayVariant}
        className={
          selected
            ? "border-primary ring-2 ring-primary-border"
            : "hover:border-primary-border"
        }
        isFavorite={isFavorite}
        favoriteLoadState={favoriteLoadState}
        onFavoriteToggle={onFavorite ? () => onFavorite(property) : undefined}
        onFavoriteRetry={onFavoriteRetry}
      />
    </div>
  );
};
