import React from "react";
import { GitCompareArrows } from "lucide-react";
import type { VehiclePublic } from "@shongre/contracts/auto";
import { IconButton } from "../../../design-system";
import { ListingCardViewCard } from "../../../design-system/primitives/ListingCard";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { presentVehicleListingCard } from "../../../domains/listing/listing-card.presentation";

interface Props {
  vehicle: VehiclePublic;
  compared?: boolean;
  onCompare?: (vehicle: VehiclePublic) => void;
  onFavorite?: (vehicle: VehiclePublic) => void;
  compact?: boolean;
}

export const AutoVehicleCard: React.FC<Props> = ({
  vehicle,
  compared = false,
  onCompare,
  onFavorite,
  compact = false,
}) => {
  const { currentLocale, convertMoney } = useMarketLocation();
  const listing = presentVehicleListingCard(
    vehicle,
    currentLocale,
    convertMoney,
  );

  return (
    <div className="h-full min-w-0" data-listing-card-consumer="auto">
      <ListingCardViewCard
        listing={listing}
        href={`/auto/vehicule/${vehicle.slug}`}
        variant={compact ? "compact" : "list"}
        isFavorite={vehicle.isFavorite}
        favoriteLabel={`${vehicle.isFavorite ? "Retirer" : "Ajouter"} ${
          vehicle.title
        } ${vehicle.isFavorite ? "des" : "aux"} favoris`}
        onFavoriteToggle={onFavorite ? () => onFavorite(vehicle) : undefined}
        quickAction={
          onCompare ? (
            <IconButton
              ariaLabel={`${compared ? "Retirer" : "Ajouter"} ${
                vehicle.title
              } ${compared ? "de" : "à"} la comparaison`}
              aria-pressed={compared}
              size="sm"
              variant={compared ? "primary" : "secondary"}
              className="rounded-pill bg-bg-surface/95 shadow-xs"
              onClick={() => onCompare(vehicle)}
            >
              <GitCompareArrows
                className="h-icon-sm w-icon-sm"
                aria-hidden="true"
              />
            </IconButton>
          ) : undefined
        }
      />
    </div>
  );
};
