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
  cursor?: string;
  city?: string;
  sortBy?: BackendListingSearchRequest["sortBy"];
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
  total: number;
  totalRelation: "exact" | "lower_bound";
  pageInfo: { hasNextPage: boolean; nextCursor?: string };
  /** The API's nearest known spelling, offered only when nothing matched. */
  didYouMean?: string;
}

/** A completion of what the visitor typed, ranked by the API. */
export interface MobileSearchSuggestion {
  /** The complete query to run. */
  query: string;
  label: string;
}

export interface MobilePublicationDraft {
  title: string;
  description: string;
  price: string;
  city: string;
  postalCode: string;
  categoryId: string;
  listingTypeId: string;
  attributes: Record<string, unknown>;
  images: string[];
  /** Preserved by the adapter when the same draft was started on Web. */
  source: Record<string, unknown>;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export interface ListingsService {
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
  getDraft(marketCode: string): Promise<MobilePublicationDraft | null>;
  saveDraft(
    marketCode: string,
    input: MobilePublicationDraft & {
      listingIntent?: string;
      taxonomyRevision?: number;
    },
  ): Promise<MobilePublicationDraft>;
}

export class HttpListingsService implements ListingsService {
  async getDraft(marketCode: string): Promise<MobilePublicationDraft | null> {
    const response = await apiOperation(
      "getListingDraftsCurrent",
      {},
      marketCode,
    );
    if (!response || typeof response !== "object" || Array.isArray(response))
      return null;
    const source = record(response);
    const pricing = record(source.pricing);
    const location = record(source.location);
    const photos = Array.isArray(source.photos) ? source.photos : [];
    return {
      title: string(source.title),
      description: string(source.description),
      price:
        string(source.nativePriceInput) ||
        (typeof pricing.amount === "number"
          ? String(pricing.amount)
          : typeof source.price === "number"
            ? String(source.price)
            : ""),
      city: string(location.city) || string(source.city),
      postalCode: string(location.postalCode) || string(source.postalCode),
      categoryId: string(source.taxonomyNodeId) || string(source.categoryId),
      listingTypeId: string(source.listingTypeId),
      attributes: record(source.attributes),
      images: photos.flatMap((photo) => {
        const url = string(record(photo).url);
        return /^https?:\/\//.test(url) ? [url] : [];
      }),
      source,
    };
  }

  async saveDraft(
    marketCode: string,
    input: MobilePublicationDraft & {
      listingIntent?: string;
      taxonomyRevision?: number;
    },
  ): Promise<MobilePublicationDraft> {
    const source = input.source;
    const amount = Number(input.price.replace(",", "."));
    const remotePhotos = input.images.filter((url) => /^https?:\/\//.test(url));
    const sourcePhotos = Array.isArray(source.photos) ? source.photos : [];
    const pricing = record(source.pricing);
    const location = record(source.location);
    const draft = {
      ...source,
      marketCode,
      selectedMarkets: Array.isArray(source.selectedMarkets)
        ? source.selectedMarkets
        : [marketCode],
      taxonomyNodeId: input.categoryId,
      listingTypeId: input.listingTypeId,
      ...(input.taxonomyRevision !== undefined
        ? { taxonomyRevision: input.taxonomyRevision }
        : {}),
      taxonomyVersion: "v1",
      listingIntent: input.listingIntent || source.listingIntent || "SELL",
      title: input.title,
      description: input.description,
      condition: source.condition || "very_good",
      attributes: input.attributes,
      photos: remotePhotos.map(
        (url, index) =>
          sourcePhotos.find((photo) => string(record(photo).url) === url) ?? {
            id: `${index}:${url}`,
            url,
            isCover: index === 0,
          },
      ),
      pricing: {
        ...pricing,
        priceModel:
          input.listingIntent === "DONATE"
            ? "free"
            : pricing.priceModel || "fixed",
        amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
        currency:
          getCountryConfig(marketCode)?.currency || string(pricing.currency),
        isNegotiable: pricing.isNegotiable ?? false,
        isFreeDonation: input.listingIntent
          ? input.listingIntent === "DONATE"
          : (pricing.isFreeDonation ?? false),
      },
      nativePriceInput: input.price,
      fulfillment: source.fulfillment || {
        allowHandDelivery: true,
        allowParcelShipping: false,
      },
      location: {
        ...location,
        city: input.city,
        postalCode: input.postalCode,
        countryCode: marketCode,
        hideExactAddress: location.hideExactAddress ?? true,
      },
      currentStep:
        typeof source.currentStep === "number" ? source.currentStep : 1,
      updatedAt: new Date().toISOString(),
    };
    await apiOperation(
      "putListingDraftsCurrent",
      {
        body: draft,
      },
      marketCode,
    );
    return { ...input, source: draft };
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
      ...(input.cursor ? { cursor: input.cursor } : {}),
      ...(input.city?.trim() ? { city: input.city.trim() } : {}),
      ...(input.sortBy ? { sortBy: input.sortBy } : {}),
    };
    const response = await apiOperation(
      "postListingsSearch",
      { body: searchPayload },
      input.marketCode,
    );
    return {
      items: response.items.map(mapBackendListing),
      total: response.total,
      totalRelation: response.totalRelation,
      pageInfo: response.pageInfo,
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
