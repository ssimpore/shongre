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
import type { ListingCharacteristicsData } from "@shongre/features/listings/facts";
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
  /** A published taxonomy node; wins over the scope's canonical root. */
  categoryId?: string;
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

export interface MobileListingSearchResult {
  items: ListingCardView[];
  /** The API's nearest known spelling, offered only when nothing matched. */
  didYouMean?: string;
}

/** A completion of what the visitor typed, ranked by the API. */
export interface MobileSearchSuggestion {
  /** The complete query to run. */
  query: string;
  label: string;
}

export interface ListingsService {
  list(marketCode: string): Promise<ListingCardView[]>;
  search(input: MobileListingSearchInput): Promise<MobileListingSearchResult>;
  /** Completions for the search field; categories are folded into queries. */
  suggest(
    query: string,
    marketCode: string,
    locale?: string,
  ): Promise<MobileSearchSuggestion[]>;
  get(id: string, marketCode: string): Promise<ListingCardView | null>;
  /** The published characteristics behind a listing's key facts and amenities. */
  characteristics(
    id: string,
    marketCode: string,
    locale?: string,
  ): Promise<ListingCharacteristicsData | null>;
  /** The seller's other listings, filtered by the API rather than the device. */
  bySeller(
    sellerId: string,
    marketCode: string,
    limit?: number,
  ): Promise<ListingCardView[]>;
  publish(input: PublicationInput, actor: AuthUser): Promise<ListingCardView>;
}

export class HttpListingsService implements ListingsService {
  async list(marketCode: string): Promise<ListingCardView[]> {
    const response = await apiOperation("getListings", {}, marketCode);
    return response.listings.map(mapBackendListing);
  }

  async search(
    input: MobileListingSearchInput,
  ): Promise<MobileListingSearchResult> {
    const query = input.query?.trim();
    const categoryId =
      input.categoryId || mobileSearchCategoryId(input.scope ?? "marketplace");
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
    return {
      items: response.items.map(mapBackendListing),
      ...(response.didYouMean ? { didYouMean: response.didYouMean } : {}),
    };
  }

  async suggest(
    query: string,
    marketCode: string,
    locale?: string,
  ): Promise<MobileSearchSuggestion[]> {
    const normalized = query.trim();
    if (!normalized) return [];
    const response = await apiOperation(
      "getListingsSuggestions",
      { query: { q: normalized, limit: 6, ...(locale ? { locale } : {}) } },
      marketCode,
    );
    // The native search has no category picker yet, so a category becomes a
    // query for its label rather than a dead end.
    return response.items.map((item) =>
      item.kind === "term"
        ? { query: item.query, label: item.label }
        : { query: item.label, label: item.label },
    );
  }

  async get(id: string, marketCode: string): Promise<ListingCardView | null> {
    const item = await apiOperation(
      "getListingsById",
      { path: { id: id } },
      marketCode,
    );
    return item ? mapBackendListing(item) : null;
  }

  async characteristics(
    id: string,
    marketCode: string,
    locale?: string,
  ): Promise<ListingCharacteristicsData | null> {
    try {
      return await apiOperation(
        "getListingCharacteristics",
        { path: { id }, ...(locale ? { query: { locale } } : {}) },
        marketCode,
      );
    } catch {
      // A detail screen without its characteristics is still a detail screen.
      return null;
    }
  }

  async bySeller(
    sellerId: string,
    marketCode: string,
    limit = 8,
  ): Promise<ListingCardView[]> {
    const response = await apiOperation(
      "postListingsSearch",
      { body: { marketCode, sellerId, limit } as BackendListingSearchRequest },
      marketCode,
    );
    return response.items.map(mapBackendListing);
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
        taxonomyRevision: draft.taxonomyRevision,
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
