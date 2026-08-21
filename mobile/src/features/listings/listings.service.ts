import {
  publicationInputSchema,
  type ListingCardView,
  type PublicationInput,
} from "@shongre/contracts";
import { apiRequest } from "@/api/http-client";
import { mobileEnvironment } from "@/config/environment";
import { mapBackendListing, type BackendListing } from "./listing.mapper";

const demoListings: ListingCardView[] = [
  {
    id: "list_1",
    title: "Vélo de route carbone Shimano 105",
    price: { amountMinor: 125000, currency: "EUR" },
    imageUrl:
      "https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=900&q=80",
    city: "Paris",
    marketCode: "FR",
    conditionLabel: "Très bon état",
    publishedAt: "2026-08-18T09:30:00.000Z",
    seller: {
      id: "user_camille",
      name: "Camille Martin",
      sellerType: "individual",
      city: "Lyon",
      isIdentityVerified: true,
    },
    isUrgent: true,
    isFeatured: false,
  },
  {
    id: "list_2",
    title: "Fauteuil lounge en chêne massif",
    price: { amountMinor: 34000, currency: "EUR" },
    imageUrl:
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=80",
    city: "Bordeaux",
    marketCode: "FR",
    conditionLabel: "Bon état",
    publishedAt: "2026-08-17T15:10:00.000Z",
    seller: {
      id: "pro_atelier",
      name: "Atelier Rive Gauche",
      sellerType: "pro",
      city: "Bordeaux",
      isIdentityVerified: true,
    },
    isUrgent: false,
    isFeatured: true,
  },
  {
    id: "list_3",
    title: "Appareil photo hybride avec objectif",
    price: { amountMinor: 69000, currency: "EUR" },
    imageUrl:
      "https://images.unsplash.com/photo-1606980707986-e5e1e62c0f28?auto=format&fit=crop&w=900&q=80",
    city: "Lille",
    marketCode: "FR",
    conditionLabel: "Comme neuf",
    publishedAt: "2026-08-15T08:00:00.000Z",
    isUrgent: false,
    isFeatured: false,
  },
];

export interface ListingsService {
  list(query?: string): Promise<ListingCardView[]>;
  get(id: string): Promise<ListingCardView | null>;
  publish(input: PublicationInput): Promise<ListingCardView>;
}

export class DemoListingsService implements ListingsService {
  async list(query = ""): Promise<ListingCardView[]> {
    const normalized = query.trim().toLocaleLowerCase("fr-FR");
    return demoListings.filter(
      (item) =>
        !normalized ||
        item.title.toLocaleLowerCase("fr-FR").includes(normalized),
    );
  }
  async get(id: string): Promise<ListingCardView | null> {
    return demoListings.find((item) => item.id === id) || null;
  }
  async publish(input: PublicationInput): Promise<ListingCardView> {
    const draft = publicationInputSchema.parse(input);
    return {
      id: "demo-new-listing",
      title: draft.title,
      price: { amountMinor: draft.amountMinor, currency: draft.currency },
      imageUrl: draft.images[0],
      city: draft.city,
      marketCode: draft.marketCode,
      conditionLabel: draft.condition,
      publishedAt: "2026-08-21T10:00:00.000Z",
      isUrgent: false,
      isFeatured: false,
    };
  }
}

export class HttpListingsService implements ListingsService {
  async list(query = ""): Promise<ListingCardView[]> {
    const response = query
      ? await apiRequest<{ items: BackendListing[] }>("/listings/search", {
          method: "POST",
          body: JSON.stringify({ query }),
        })
      : await apiRequest<{ listings: BackendListing[] }>("/listings");
    const items = "items" in response ? response.items : response.listings;
    return items.map(mapBackendListing);
  }

  async get(id: string): Promise<ListingCardView | null> {
    const item = await apiRequest<BackendListing | null>(
      `/listings/${encodeURIComponent(id)}`,
    );
    return item ? mapBackendListing(item) : null;
  }

  async publish(input: PublicationInput): Promise<ListingCardView> {
    const draft = publicationInputSchema.parse(input);
    const item = await apiRequest<BackendListing>("/listings/publish", {
      method: "POST",
      body: JSON.stringify({
        draft: {
          title: draft.title,
          description: draft.description,
          price: draft.amountMinor / 100,
          categoryId: draft.categoryId,
          marketCode: draft.marketCode,
          city: draft.city,
          postalCode: draft.postalCode,
          condition: draft.condition,
          images: draft.images,
        },
      }),
    });
    return mapBackendListing(item);
  }
}

export const listingsService: ListingsService =
  mobileEnvironment.dataMode === "demo"
    ? new DemoListingsService()
    : new HttpListingsService();
