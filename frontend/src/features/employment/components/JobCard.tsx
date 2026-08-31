import React from "react";
import type { MarketCode } from "@shongre/contracts";
import type {
  EmploymentCatalog,
  JobPostingCard,
} from "@shongre/contracts/employment";
import { ListingCardViewCard } from "../../../design-system/primitives/ListingCard";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { presentEmploymentListingCard } from "../../../domains/listing/listing-card.presentation";

export const JobCard: React.FC<{
  job: JobPostingCard;
  catalog?: EmploymentCatalog | null;
  onSave?: (job: JobPostingCard) => void;
  compact?: boolean;
}> = ({ job, catalog, onSave, compact = false }) => {
  const { activeMarket, currentCurrency, currentLocale } = useMarketLocation();
  const listing = presentEmploymentListingCard(
    job,
    catalog,
    currentLocale,
    activeMarket.code as MarketCode,
    currentCurrency,
  );

  return (
    <div className="min-w-0" data-listing-card-consumer="employment">
      <ListingCardViewCard
        listing={listing}
        href={`/emploi/offre/${job.slug}`}
        variant={compact ? "compact" : "list"}
        imageFit="contain"
        isFavorite={job.saved}
        favoriteLabel={`${job.saved ? "Retirer" : "Enregistrer"} l’offre ${
          job.title
        }`}
        onFavoriteToggle={onSave ? () => onSave(job) : undefined}
      />
    </div>
  );
};
