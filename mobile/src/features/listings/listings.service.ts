import {
  CANONICAL_TAXONOMY_IDS,
  getCountryConfig,
  publicationInputSchema,
  type AuthUser,
  type ListingCardView,
  type PublicationInput,
} from "@shongre/contracts";
import { apiOperation } from "@/api/generated-api-operation";
import type { operations } from "@shongre/contracts/openapi";
import { minorToMajorAmount } from "@shongre/shared/money";
import { requireMobileAuthorization } from "@/features/auth/authorization";
import { mapBackendListing } from "./listing.mapper";

type BackendListingSearchRequest =
  operations["postListingsSearch"]["requestBody"]["content"]["application/json"];
type BackendPublicationRequest =
  operations["postListingsPublish"]["requestBody"]["content"]["application/json"];

export type MobileSearchScope =
  "marketplace" | "auto" | "immo" | "emploi" | "education";

export interface MobileListingSearchInput {
  marketCode: string;
  query?: string;
  scope?: MobileSearchScope;
  minPrice?: number;
  maxPrice?: number;
}

export function mobileSearchCategoryId(
  scope: MobileSearchScope,
): string | undefined {
  return {
    marketplace: undefined,
    auto: CANONICAL_TAXONOMY_IDS.vehicles,
    immo: CANONICAL_TAXONOMY_IDS.realEstate,
    emploi: CANONICAL_TAXONOMY_IDS.jobs,
    education: CANONICAL_TAXONOMY_IDS.courses,
  }[scope];
}

export interface ListingsService {
  list(marketCode: string): Promise<ListingCardView[]>;
  search(input: MobileListingSearchInput): Promise<ListingCardView[]>;
  get(id: string, marketCode: string): Promise<ListingCardView | null>;
  publish(input: PublicationInput, actor: AuthUser): Promise<ListingCardView>;
}

export class HttpListingsService implements ListingsService {
  async list(marketCode: string): Promise<ListingCardView[]> {
    const response = await apiOperation("getListings", {}, marketCode);
    return response.listings.map(mapBackendListing);
  }

  async search(input: MobileListingSearchInput): Promise<ListingCardView[]> {
    const query = input.query?.trim();
    const categoryId = mobileSearchCategoryId(input.scope ?? "marketplace");
    const searchPayload: BackendListingSearchRequest = {
      marketCode: input.marketCode,
      ...(query ? { query } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(input.minPrice !== undefined ? { minPrice: input.minPrice } : {}),
      ...(input.maxPrice !== undefined ? { maxPrice: input.maxPrice } : {}),
    };
    const response = await apiOperation(
      "postListingsSearch",
      { body: searchPayload },
      input.marketCode,
    );
    return response.items.map(mapBackendListing);
  }

  async get(id: string, marketCode: string): Promise<ListingCardView | null> {
    const item = await apiOperation(
      "getListingsById",
      { path: { id: id } },
      marketCode,
    );
    return item ? mapBackendListing(item) : null;
  }

  async publish(
    input: PublicationInput,
    actor: AuthUser,
  ): Promise<ListingCardView> {
    const draft = publicationInputSchema.parse(input);
    const market = getCountryConfig(draft.marketCode);
    requireMobileAuthorization(actor, {
      capability: "listing.create",
      market: {
        code: draft.marketCode,
        enabled: Boolean(market?.marketplace.enabled),
      },
    });
    const payload: BackendPublicationRequest = {
      draft: {
        title: draft.title,
        description: draft.description,
        price: minorToMajorAmount(draft.amountMinor, draft.currency),
        categoryId: draft.categoryId,
        listingTypeId: draft.listingTypeId,
        intent: draft.listingIntent,
        taxonomyVersion: draft.taxonomyVersion,
        marketCode: draft.marketCode,
        city: draft.city,
        postalCode: draft.postalCode,
        condition: draft.condition,
        images: draft.images,
        attributes: draft.attributes,
        fulfillmentTypes: draft.digitalFulfillment
          ? draft.digitalFulfillment.fulfillmentTypes
          : ["PHYSICAL"],
        digitalFulfillment: draft.digitalFulfillment,
      },
    };
    const item = await apiOperation(
      "postListingsPublish",
      { body: payload },
      draft.marketCode,
    );
    return mapBackendListing(item);
  }
}

export const listingsService: ListingsService = new HttpListingsService();
