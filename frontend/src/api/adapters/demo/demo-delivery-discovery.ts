import { getCountryConfig } from "@shongre/contracts";
import {
  DELIVERY_FEATURE_FLAG_KEY,
  deliveryMarketActivationIssues,
} from "@shongre/contracts/delivery";
import type { Listing } from "../../../types";
import { demoFeatureFlagService } from "./demo-feature-flag.service";

function isDeliveryListing(listing: Listing): boolean {
  return listing.attributes?.verticalType === "delivery";
}

export async function filterDemoDeliveryDiscoveryListings(
  listings: Listing[],
): Promise<Listing[]> {
  const deliveryMarkets = Array.from(
    new Set(
      listings.filter(isDeliveryListing).flatMap((listing) => {
        const marketCode = listing.marketCode?.trim().toUpperCase();
        return marketCode ? [marketCode] : [];
      }),
    ),
  );
  if (deliveryMarkets.length === 0) return listings;

  const enabledMarkets = new Set(
    (
      await Promise.all(
        deliveryMarkets.map(async (marketCode) => {
          const country = getCountryConfig(marketCode);
          if (!country || deliveryMarketActivationIssues(country).length > 0)
            return undefined;
          const flag = await demoFeatureFlagService.evaluate(
            DELIVERY_FEATURE_FLAG_KEY,
            { marketCode },
          );
          return flag.enabled ? marketCode : undefined;
        }),
      )
    ).filter((marketCode): marketCode is string => Boolean(marketCode)),
  );

  return listings.filter(
    (listing) =>
      !isDeliveryListing(listing) ||
      enabledMarkets.has(listing.marketCode?.trim().toUpperCase() ?? ""),
  );
}
