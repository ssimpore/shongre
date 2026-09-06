import type { Money, MoneyConversionProjection } from "@shongre/contracts";
import {
  getListingCardPriceText,
  getListingPromotionBadges,
  type ListingCardPriceLabels,
} from "@shongre/features";
import type { Listing } from "../../types";
import { projectGenericListingCardView } from "../../domains/listing/listing-card.generic-presentation";

export function presentExploreMapMarker(
  listing: Listing,
  locale: string,
  marketCode: string,
  priceLabels: ListingCardPriceLabels,
  convertMoney?: (money: Money) => MoneyConversionProjection,
) {
  const card = projectGenericListingCardView(
    listing,
    locale,
    marketCode,
    undefined,
    convertMoney,
  );
  return {
    priceText: getListingCardPriceText(card, locale, priceLabels),
    isBoosted: getListingPromotionBadges(card).length > 0,
  };
}
