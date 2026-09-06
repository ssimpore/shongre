import {
  getCountryConfig,
  publicationInputSchema,
  type ListingCardView,
  type PublicationInput,
  type AuthUser,
} from "@shongre/contracts";
import { getTaxonomyV4CardRootLabel } from "@shongre/contracts/taxonomy-v4-card";
import type { operations } from "@shongre/contracts/openapi";
import { apiRequest } from "@/api/http-client";
import { minorToMajorAmount } from "@shongre/shared/money";
import { mobileEnvironment } from "@/config/environment";
import { requireMobileAuthorization } from "@/features/auth/authorization";
import { mapBackendListing, type BackendListing } from "./listing.mapper";
import { createDemoListingPromotion } from "./listing.demo-promotion";

type BackendListingCollection =
  operations["getListings"]["responses"][200]["content"]["application/json"];
type BackendListingDetail =
  operations["getListingsById"]["responses"][200]["content"]["application/json"];
type BackendListingSearchResult =
  operations["postListingsSearch"]["responses"][200]["content"]["application/json"];

const demoListings: ListingCardView[] = [
  {
    id: "list_1",
    title: "Vélo de route carbone Shimano 105",
    price: { amountMinor: 125000, currency: "EUR" },
    imageUrl:
      "https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=900&q=80",
    city: "Paris",
    marketCode: "FR",
    categoryLabel: "Sports",
    conditionLabel: "Très bon état",
    characteristics: ["Cadre carbone", "Shimano 105"],
    characteristicIcons: ["layers", "tag"],
    publishedAt: "2026-08-18T09:30:00.000Z",
    seller: {
      id: "user_camille",
      name: "Camille Martin",
      sellerType: "individual",
      city: "Lyon",
      isIdentityVerified: true,
      isBusinessVerified: false,
    },
    isUrgent: true,
    isFeatured: false,
    promotion: createDemoListingPromotion(
      "list_1",
      "FR",
      "urgent_badge",
      "2026-08-18T09:30:00.000Z",
      "2027-08-18T09:30:00.000Z",
    ),
  },
  {
    id: "list_2",
    title: "Fauteuil lounge en chêne massif",
    price: { amountMinor: 34000, currency: "EUR" },
    imageUrl:
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=80",
    city: "Bordeaux",
    marketCode: "FR",
    categoryLabel: "Maison",
    conditionLabel: "Bon état",
    characteristics: ["Chêne massif", "Fabrication artisanale"],
    characteristicIcons: ["layers", "tag"],
    publishedAt: "2026-08-17T15:10:00.000Z",
    seller: {
      id: "pro_atelier",
      name: "Atelier Rive Gauche",
      sellerType: "pro",
      city: "Bordeaux",
      isIdentityVerified: true,
      isBusinessVerified: true,
    },
    isUrgent: false,
    isFeatured: true,
    promotion: createDemoListingPromotion(
      "list_2",
      "FR",
      "featured",
      "2026-08-17T15:10:00.000Z",
      "2027-08-17T15:10:00.000Z",
    ),
  },
  {
    id: "list_3",
    title: "Appareil photo hybride avec objectif",
    price: { amountMinor: 69000, currency: "EUR" },
    imageUrl:
      "https://images.unsplash.com/photo-1606980707986-e5e1e62c0f28?auto=format&fit=crop&w=900&q=80",
    city: "Lille",
    marketCode: "FR",
    categoryLabel: "Électronique",
    conditionLabel: "Comme neuf",
    characteristics: ["Hybride", "Objectif inclus"],
    characteristicIcons: ["tag", "tag"],
    publishedAt: "2026-08-15T08:00:00.000Z",
    isUrgent: false,
    isFeatured: false,
  },
  {
    id: "list_digital_file",
    title: "Guide d’installation numérique",
    price: { amountMinor: 2900, currency: "EUR" },
    imageUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    city: "",
    marketCode: "FR",
    categoryLabel: "Électronique",
    conditionLabel: "Version numérique",
    characteristics: ["Produit numérique", "Fichier privé"],
    characteristicIcons: ["laptop", "file"],
    publishedAt: "2026-08-30T10:00:00.000Z",
    fulfillmentTypes: ["FILE_DOWNLOAD"],
    requiresPhysicalDelivery: false,
    productVersion: "2026.09",
    seller: {
      id: "user_camille",
      name: "Camille Martin",
      sellerType: "individual",
      isIdentityVerified: true,
      isBusinessVerified: false,
    },
    isUrgent: false,
    isFeatured: false,
  },
  {
    id: "auto_fr_1",
    title: "Peugeot 3008 Hybrid 136 Allure",
    price: { amountMinor: 3290000, currency: "EUR" },
    imageUrl:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=900&q=80",
    city: "Nantes",
    marketCode: "FR",
    categoryLabel: "Véhicules",
    brandLabel: "Peugeot",
    conditionLabel: "Occasion",
    characteristics: ["Auto", "Hybride", "32 000 km"],
    characteristicIcons: ["tag", "fuel", "gauge"],
    publishedAt: "2026-08-28T09:00:00.000Z",
    isUrgent: false,
    isFeatured: true,
    promotion: createDemoListingPromotion(
      "auto_fr_1",
      "FR",
      "featured",
      "2026-08-28T09:00:00.000Z",
      "2027-08-28T09:00:00.000Z",
    ),
  },
  {
    id: "immo_fr_1",
    title: "Appartement lumineux 3 pièces avec balcon",
    price: { amountMinor: 38900000, currency: "EUR" },
    imageUrl:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
    city: "Lyon",
    marketCode: "FR",
    categoryLabel: "Immobilier",
    conditionLabel: "Immobilier",
    characteristics: ["Immo", "68 m²", "3 pièces"],
    characteristicIcons: ["home", "ruler", "layout-grid"],
    publishedAt: "2026-08-27T11:00:00.000Z",
    isUrgent: false,
    isFeatured: false,
  },
  {
    id: "emploi_fr_1",
    title: "Développeur React Native — CDI",
    price: { amountMinor: 4800000, currency: "EUR" },
    city: "Paris",
    marketCode: "FR",
    categoryLabel: "Emploi",
    conditionLabel: "Emploi",
    characteristics: ["Emploi", "CDI", "Télétravail hybride"],
    characteristicIcons: ["briefcase", "briefcase", "laptop"],
    publishedAt: "2026-08-26T07:30:00.000Z",
    isUrgent: true,
    isFeatured: false,
    promotion: createDemoListingPromotion(
      "emploi_fr_1",
      "FR",
      "urgent_badge",
      "2026-08-26T07:30:00.000Z",
      "2027-08-26T07:30:00.000Z",
    ),
  },
  {
    id: "education_fr_1",
    title: "Formation UX design certifiante",
    price: { amountMinor: 149000, currency: "EUR" },
    city: "À distance",
    marketCode: "FR",
    categoryLabel: "Éducation",
    conditionLabel: "Formation",
    characteristics: ["Education", "Certification", "À distance"],
    characteristicIcons: ["book-open", "tag", "laptop"],
    publishedAt: "2026-08-25T13:00:00.000Z",
    isUrgent: false,
    isFeatured: false,
  },
  {
    id: "list_be_1",
    title: "Vélo urbain léger avec garde-boue",
    price: { amountMinor: 78000, currency: "EUR" },
    city: "Bruxelles",
    marketCode: "BE",
    categoryLabel: "Sports",
    conditionLabel: "Très bon état",
    characteristics: ["Cadre aluminium", "Éclairage inclus"],
    characteristicIcons: ["layers", "tag"],
    publishedAt: "2026-08-19T08:15:00.000Z",
    isUrgent: false,
    isFeatured: true,
    promotion: createDemoListingPromotion(
      "list_be_1",
      "BE",
      "featured",
      "2026-08-19T08:15:00.000Z",
      "2027-08-19T08:15:00.000Z",
    ),
  },
  {
    id: "list_ch_1",
    title: "Appareil photo compact expert",
    price: { amountMinor: 64000, currency: "CHF" },
    city: "Genève",
    marketCode: "CH",
    categoryLabel: "Électronique",
    conditionLabel: "Comme neuf",
    characteristics: ["Capteur 1 pouce", "Garantie restante"],
    characteristicIcons: ["gauge", "calendar"],
    publishedAt: "2026-08-20T10:30:00.000Z",
    isUrgent: true,
    isFeatured: false,
    promotion: createDemoListingPromotion(
      "list_ch_1",
      "CH",
      "urgent_badge",
      "2026-08-20T10:30:00.000Z",
      "2027-08-20T10:30:00.000Z",
    ),
  },
];

export type MobileSearchScope =
  "marketplace" | "auto" | "immo" | "emploi" | "education";

const matchesScope = (
  item: ListingCardView,
  scope: MobileSearchScope,
): boolean => {
  if (scope === "marketplace") return true;
  const aliases: Record<Exclude<MobileSearchScope, "marketplace">, string[]> = {
    auto: ["auto", "voiture", "moto"],
    immo: ["immo", "immobilier", "appartement", "maison"],
    emploi: ["emploi", "cdi", "cdd", "mission"],
    education: ["education", "formation", "cours"],
  };
  const haystack = [item.title, item.conditionLabel, ...item.characteristics]
    .join(" ")
    .toLocaleLowerCase();
  return aliases[scope].some((term) => haystack.includes(term));
};

export interface ListingsService {
  list(
    marketCode: string,
    query?: string,
    scope?: MobileSearchScope,
  ): Promise<ListingCardView[]>;
  get(id: string, marketCode: string): Promise<ListingCardView | null>;
  publish(input: PublicationInput, actor: AuthUser): Promise<ListingCardView>;
}

export class DemoListingsService implements ListingsService {
  async list(
    marketCode: string,
    query = "",
    scope: MobileSearchScope = "marketplace",
  ): Promise<ListingCardView[]> {
    const market = getCountryConfig(marketCode);
    if (!market?.marketplace.enabled)
      throw new Error("Ce marché Shongre n’est pas encore accessible.");
    const normalized = query.trim().toLocaleLowerCase(market.defaultLocale);
    return demoListings.filter(
      (item) =>
        item.marketCode === market.code &&
        matchesScope(item, scope) &&
        (!normalized ||
          item.title
            .toLocaleLowerCase(market.defaultLocale)
            .includes(normalized)),
    );
  }
  async get(id: string, marketCode: string): Promise<ListingCardView | null> {
    return (
      demoListings.find(
        (item) => item.id === id && item.marketCode === marketCode,
      ) || null
    );
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
    return {
      id: "demo-new-listing",
      title: draft.title,
      price: { amountMinor: draft.amountMinor, currency: draft.currency },
      priceKind: "amount",
      imageUrl: draft.images[0],
      city: draft.city,
      marketCode: draft.marketCode,
      categoryLabel:
        getTaxonomyV4CardRootLabel(
          draft.categoryId,
          market?.defaultLocale || "fr-FR",
        ) || draft.categoryId,
      conditionLabel: draft.condition,
      characteristics: [],
      fulfillmentTypes: draft.digitalFulfillment
        ? draft.digitalFulfillment.fulfillmentTypes
        : ["PHYSICAL"],
      requiresPhysicalDelivery: !draft.digitalFulfillment,
      productVersion: draft.digitalFulfillment?.productVersion,
      isUrgent: false,
      isFeatured: false,
    };
  }
}

class HttpListingsService implements ListingsService {
  async list(
    marketCode: string,
    query = "",
    scope: MobileSearchScope = "marketplace",
  ): Promise<ListingCardView[]> {
    const response = query
      ? await apiRequest<BackendListingSearchResult>(
          "/listings/search",
          {
            method: "POST",
            body: JSON.stringify({ query, marketCode }),
          },
          marketCode,
        )
      : await apiRequest<BackendListingCollection>("/listings", {}, marketCode);
    const items = "items" in response ? response.items : response.listings;
    return items
      .map(mapBackendListing)
      .filter((item) => matchesScope(item, scope));
  }

  async get(id: string, marketCode: string): Promise<ListingCardView | null> {
    const item = await apiRequest<BackendListingDetail>(
      `/listings/${encodeURIComponent(id)}`,
      {},
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
    const item = await apiRequest<BackendListing>(
      "/listings/publish",
      {
        method: "POST",
        body: JSON.stringify({
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
        }),
      },
      draft.marketCode,
    );
    return mapBackendListing(item);
  }
}

export const listingsService: ListingsService =
  mobileEnvironment.dataMode === "demo"
    ? new DemoListingsService()
    : new HttpListingsService();
