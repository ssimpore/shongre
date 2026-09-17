import type { ListingCardView } from "@shongre/contracts";
import { apiOperation } from "@/api/generated-api-operation";
import {
  mapBackendListing,
  type BackendListing,
} from "@/features/listings/listing.mapper";

/** The Pro workspace headline figures, as the Web dashboard shows them. */
export interface MobileProAnalytics {
  revenueByCurrency: { amountMinor: number; currency: string }[];
  monthlyViews: number;
  conversionRate: number;
  topListings: ListingCardView[];
}

export interface WorkspaceService {
  proAnalytics(
    sellerId: string,
    marketCode: string,
  ): Promise<MobileProAnalytics>;
}

export class HttpWorkspaceService implements WorkspaceService {
  async proAnalytics(
    sellerId: string,
    marketCode: string,
  ): Promise<MobileProAnalytics> {
    const analytics = await apiOperation(
      "getWorkspaceProAnalyticsBySellerId",
      { path: { sellerId } },
      marketCode,
    );
    return {
      revenueByCurrency: analytics.revenueByCurrency.map((money) => ({
        amountMinor: money.amountMinor,
        currency: money.currency,
      })),
      monthlyViews: analytics.monthlyViews,
      conversionRate: analytics.conversionRate,
      topListings: analytics.topListings.map((listing) =>
        mapBackendListing(listing as BackendListing),
      ),
    };
  }
}

export const workspaceService: WorkspaceService = new HttpWorkspaceService();
