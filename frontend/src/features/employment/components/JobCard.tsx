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
  favoriteLoadState?: "loading" | "ready" | "error";
  onFavoriteRetry?: () => void | Promise<void>;
  compact?: boolean;
  displayVariant?: "grid" | "list";
}> = ({
  job,
  catalog,
  onSave,
  favoriteLoadState = "ready",
  onFavoriteRetry,
  compact = false,
  displayVariant = "grid",
}) => {
  const { activeMarket, currentLocale, convertMoney } = useMarketLocation();
  const listing = presentEmploymentListingCard(
    job,
    catalog,
    currentLocale,
    activeMarket.code as MarketCode,
    convertMoney,
  );

  return (
    <div
      className="h-full w-full min-w-0"
      data-listing-card-consumer="employment"
    >
      <ListingCardViewCard
        listing={listing}
        href={`/emploi/offre/${job.slug}`}
        variant={compact ? "compact" : displayVariant}
        imageFit="contain"
        isFavorite={job.saved}
        favoriteLoadState={favoriteLoadState}
        onFavoriteToggle={onSave ? () => onSave(job) : undefined}
        onFavoriteRetry={onFavoriteRetry}
      />
    </div>
  );
};
