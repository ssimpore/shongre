import React from "react";
import type { MarketCode } from "@shongre/contracts";
import type {
  EmploymentCatalog,
  JobPostingCard,
} from "@shongre/contracts/employment";
import { ListingCardViewCard } from "../../../design-system/primitives/ListingCard";
import { Image } from "../../../design-system/primitives/Image";
import { IMAGE_SIZES } from "../../../design-system/primitives/responsiveImage";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { presentEmploymentListingCard } from "../../../domains/listing/listing-card.presentation";

const JOB_LISTING_FALLBACK_IMAGE = "/images/categories/emploi.jpg";

export const JobCard: React.FC<{
  job: JobPostingCard;
  catalog?: EmploymentCatalog | null;
  onSave?: (job: JobPostingCard) => void;
  compact?: boolean;
}> = ({ job, catalog, onSave, compact = false }) => {
  const { activeMarket, currentCurrency, currentLocale, convertMoney } =
    useMarketLocation();
  const listing = presentEmploymentListingCard(
    job,
    catalog,
    currentLocale,
    activeMarket.code as MarketCode,
    currentCurrency,
    convertMoney,
  );

  return (
    <div className="min-w-0" data-listing-card-consumer="employment">
      <ListingCardViewCard
        listing={listing}
        href={`/emploi/offre/${job.slug}`}
        variant={compact ? "compact" : "list"}
        image={
          <Image
            src={listing.imageUrl}
            fallbackSrc={JOB_LISTING_FALLBACK_IMAGE}
            alt=""
            sizes={compact ? IMAGE_SIZES.compact : IMAGE_SIZES.thumbnail}
            className={`h-full w-full motion-surface group-hover:scale-105 ${
              listing.imageUrl
                ? "bg-bg-subtle object-contain p-4"
                : "object-cover"
            }`}
          />
        }
        isFavorite={job.saved}
        favoriteLabel={`${job.saved ? "Retirer" : "Enregistrer"} l’offre ${
          job.title
        }`}
        onFavoriteToggle={onSave ? () => onSave(job) : undefined}
      />
    </div>
  );
};
