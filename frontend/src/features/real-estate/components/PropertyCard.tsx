import React from "react";
import type { PropertyPublic } from "@shongre/contracts/real-estate";
import { ListingCardViewCard } from "../../../design-system/primitives/ListingCard";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { presentPropertyListingCard } from "../../../domains/listing/listing-card.presentation";

export const PropertyCard: React.FC<{
  property: PropertyPublic;
  selected?: boolean;
  onSelect?: (property: PropertyPublic) => void;
  onFavorite?: (property: PropertyPublic) => void;
  compact?: boolean;
}> = ({ property, selected, onSelect, onFavorite, compact = false }) => {
  const { currentLocale, convertMoney } = useMarketLocation();
  const listing = presentPropertyListingCard(
    property,
    currentLocale,
    convertMoney,
  );

  return (
    <div
      className="h-full min-w-0"
      onMouseEnter={() => onSelect?.(property)}
      data-listing-card-consumer="real-estate"
    >
      <ListingCardViewCard
        listing={listing}
        href={`/immo/bien/${property.slug}`}
        variant={compact ? "compact" : "list"}
        className={
          selected
            ? "border-primary ring-2 ring-primary-border"
            : "hover:border-primary-border"
        }
        isFavorite={property.isFavorite}
        favoriteLabel={`${property.isFavorite ? "Retirer" : "Ajouter"} ${
          property.title
        } ${property.isFavorite ? "des" : "aux"} favoris`}
        onFavoriteToggle={onFavorite ? () => onFavorite(property) : undefined}
      />
    </div>
  );
};
