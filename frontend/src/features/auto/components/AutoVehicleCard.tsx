import React from "react";
import type { MarketCode } from "@shongre/contracts";
import type { VehiclePublic } from "@shongre/contracts/auto";
import { ListingCardViewCard } from "../../../design-system/primitives/ListingCard";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { presentVehicleListingCard } from "../../../domains/listing/listing-card.presentation";

interface Props {
  vehicle: VehiclePublic;
  isFavorite?: boolean;
  favoriteLoadState?: "loading" | "ready" | "error";
  onFavorite?: (vehicle: VehiclePublic) => void;
  onFavoriteRetry?: () => void | Promise<unknown>;
  compact?: boolean;
  displayVariant?: "grid" | "list";
  /** Set on the first result so its cover is fetched with the page, not after it. */
  imagePriority?: boolean;
}

export const AutoVehicleCard: React.FC<Props> = ({
  vehicle,
  isFavorite = vehicle.isFavorite,
  favoriteLoadState = "ready",
  onFavorite,
  onFavoriteRetry,
  compact = false,
  displayVariant = "grid",
  imagePriority = false,
}) => {
  const { activeMarket, currentLocale, convertMoney } = useMarketLocation();
  const listing = presentVehicleListingCard(
    vehicle,
    currentLocale,
    activeMarket.code as MarketCode,
    convertMoney,
  );

  return (
    <div className="h-full w-full min-w-0" data-listing-card-consumer="auto">
      <ListingCardViewCard
        listing={listing}
        href={`/auto/vehicule/${vehicle.slug}`}
        imagePriority={imagePriority}
        variant={compact ? "compact" : displayVariant}
        isFavorite={isFavorite}
        favoriteLoadState={favoriteLoadState}
        onFavoriteToggle={onFavorite ? () => onFavorite(vehicle) : undefined}
        onFavoriteRetry={onFavoriteRetry}
      />
    </div>
  );
};
