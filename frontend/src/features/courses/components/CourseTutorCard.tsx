import { useMemo } from "react";
import type {
  ListingCardView,
  MarketCode,
  Money,
  MoneyConversionProjection,
} from "@shongre/contracts";
import type { TutorSearchItem } from "@shongre/contracts/courses";
import { minorToMajorAmount } from "@shongre/shared/money";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { routes } from "../../../configuration/routes";
import { ListingCardViewCard } from "../../../design-system/primitives/ListingCard";
import { projectGenericListingCardView } from "../../../domains/listing/listing-card.generic-presentation";
import { projectCourseOffer } from "../../../domains/discovery/vertical-discovery.projection";

interface CourseTutorCardProps {
  item: TutorSearchItem;
  isCompared: boolean;
  isSaved: boolean;
  favoriteLoadState?: "loading" | "ready" | "error";
  onToggleCompare: (id: string) => void;
  onToggleSaved: (id: string) => void | Promise<unknown>;
  onFavoriteRetry?: () => void | Promise<unknown>;
  displayVariant?: "grid" | "list";
}

export function presentCourseTutorCard(
  item: TutorSearchItem,
  locale: string,
  marketCode: MarketCode,
  convertMoney?: (money: Money) => MoneyConversionProjection,
): ListingCardView {
  const activePricingOption = item.offer.pricingOptions
    .filter((option) => option.isActive)
    .sort((left, right) => left.price.amountMinor - right.price.amountMinor)[0];
  const projected = projectCourseOffer(
    item.tutor,
    item.offer,
    item.subjectLabel,
    marketCode,
    item.resolvedPromotion,
  );
  const price = activePricingOption?.price;
  const listing = projectGenericListingCardView(
    price
      ? {
          ...projected,
          price: minorToMajorAmount(price.amountMinor, price.currency),
          currency: price.currency,
          pricePresentation: {
            kind: "service_rate",
            visibility: "public",
            minimumAmountMinor: price.amountMinor,
            maximumAmountMinor: price.amountMinor,
            currency: price.currency,
            period: activePricingOption.type === "hourly" ? "hour" : "total",
          },
          attributes: {
            ...projected.attributes,
            price_type:
              activePricingOption.type === "trial" && price.amountMinor === 0
                ? "free"
                : undefined,
          },
        }
      : projected,
    locale,
    marketCode,
    undefined,
    convertMoney,
  );

  return {
    ...listing,
    seller: listing.seller
      ? {
          ...listing.seller,
          rating: item.tutor.rating,
          reviewCount: item.tutor.reviewCount,
        }
      : undefined,
  };
}

export function CourseTutorCard({
  item,
  isCompared,
  isSaved,
  favoriteLoadState = "ready",
  onToggleCompare,
  onToggleSaved,
  onFavoriteRetry,
  displayVariant = "grid",
}: CourseTutorCardProps) {
  const { activeMarket, currentLocale, convertMoney } = useMarketLocation();
  const listing = useMemo(
    () =>
      presentCourseTutorCard(
        item,
        currentLocale,
        activeMarket.code as MarketCode,
        convertMoney,
      ),
    [activeMarket.code, convertMoney, currentLocale, item],
  );

  return (
    <div
      className="flex h-full min-w-0 flex-col gap-2"
      data-listing-card-consumer="courses"
    >
      <ListingCardViewCard
        listing={listing}
        href={routes.courses.tutor(item.tutor.slug)}
        variant={displayVariant}
        isFavorite={isSaved}
        favoriteLoadState={favoriteLoadState}
        onFavoriteToggle={() => onToggleSaved(item.tutor.id)}
        onFavoriteRetry={onFavoriteRetry}
      />
      <label className="flex min-h-control-target cursor-pointer items-center gap-2 px-1 text-xs font-medium text-text-secondary">
        <input
          type="checkbox"
          checked={isCompared}
          onChange={() => onToggleCompare(item.tutor.id)}
        />
        Comparer
      </label>
    </div>
  );
}
