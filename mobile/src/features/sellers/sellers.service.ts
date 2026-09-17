import { apiOperation } from "@/api/generated-api-operation";
import type { components } from "@shongre/contracts/openapi";

export type MobilePublicSeller = components["schemas"]["PublicSellerProfile"];
export type MobileSellerReview = components["schemas"]["MarketplaceReview"];

export interface SellersService {
  /** The public profile by account id or public slug, or null when absent. */
  profile(idOrSlug: string): Promise<MobilePublicSeller | null>;
  /** The visible reviews left for a person, newest first. */
  reviews(userId: string): Promise<MobileSellerReview[]>;
}

export class HttpSellersService implements SellersService {
  async profile(idOrSlug: string): Promise<MobilePublicSeller | null> {
    return apiOperation("getUsersById", { path: { id: idOrSlug } });
  }

  async reviews(userId: string): Promise<MobileSellerReview[]> {
    return [
      ...(await apiOperation("getReviewsUserByUserId", { path: { userId } })),
    ];
  }
}

export const sellersService: SellersService = new HttpSellersService();
