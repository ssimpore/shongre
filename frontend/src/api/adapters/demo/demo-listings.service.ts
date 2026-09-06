import {
  BulkListingImportTemplate,
  ListingsServiceContract,
  ParseBulkListingImportInput,
  PublishBulkListingsInput,
} from "../../contracts/listings.contract";
import { listingRepository } from "../../../repositories/listing.repository";
import { storageService } from "../../../services/storage.service";
import { Listing, SearchFilters } from "../../../types";
import { PublicationDraftState } from "../../../domains/publication/publication.types";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { marketService } from "../../../domains/market/market.service";
import { resolveCanonicalTaxonomyIdentity } from "../../../domains/taxonomy/taxonomy.identity";
import { requireDemoCapability } from "./demo-authorization";
import { filterDemoDeliveryDiscoveryListings } from "./demo-delivery-discovery";
import { deliveryDiscoveryListingId } from "@shongre/contracts/delivery";
import { demoDeliveryFavoritesStore } from "./demo-delivery-favorites.store";

const BULK_IMPORT_SAMPLE: BulkListingImportTemplate = {
  fileName: "modele_import_annonces_shongre.csv",
  content: `Titre;Categorie;SousCategorie;Prix;Etat;Stock;Ville;CodePostal;Description
Table basse chêne massif;home_garden;furniture;180;very_good;2;Lyon;69002;Superbe table basse en chêne massif huilé, pieds métal noir.
Lot 4 chaises scandinaves;home_garden;furniture;120;new_without_tag;4;Lyon;69002;Chaises design scandinave tissu gris chiné neuves.
Lampadaire trépied vintage;home_garden;furniture;65;very_good;1;Lyon;69002;Lampadaire esprit projecteur de cinéma avec variateur.
Miroir mural doré baroque;home_garden;furniture;95;good;1;Lyon;69002;Grand miroir moulure dorée 120x80cm.`,
};

const loadPublicationService = () =>
  import("../../../domains/publication/publication.service").then(
    ({ publicationService }) => publicationService,
  );

function taxonomyIdentityLabel(value: string): string {
  const identity = resolveCanonicalTaxonomyIdentity(value);
  return identity?.shortLabels?.["fr-FR"] || identity?.labels["fr-FR"] || value;
}

function splitSemicolonRow(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ";" && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
}

export class DemoListingsService implements ListingsServiceContract {
  private async getVisibleListings(filter: SearchFilters = {}) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.max(1, filter.limit ?? 12);
    const result = await listingRepository.getListings({
      ...filter,
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
    });
    const visible = await filterDemoDeliveryDiscoveryListings(result.listings);
    const start = (page - 1) * limit;
    return {
      listings: visible.slice(start, start + limit),
      total: visible.length,
      page,
      totalPages: Math.max(1, Math.ceil(visible.length / limit)),
    };
  }

  async getListings(
    filter?: SearchFilters,
  ): Promise<{ listings: Listing[]; total: number }> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.read");
    return this.getVisibleListings(filter);
  }

  async getListingById(id: string): Promise<Listing | null> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.read");
    const listing = await listingRepository.getListingById(id);
    if (!listing) return null;
    return (await filterDemoDeliveryDiscoveryListings([listing]))[0] ?? null;
  }

  async getOwnListings(userId: string, marketCode: string) {
    await simulateNetworkDelay();
    requireDemoCapability("marketplace.customer.access");
    const listings = (await listingRepository.getListingsBySeller(userId))
      .filter(
        (listing) =>
          listing.marketCode === marketCode ||
          listing.marketCodes?.includes(marketCode),
      )
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      );
    return { listings, total: listings.length };
  }

  async getPublicListingsByIds(
    listingIds: readonly string[],
    marketCode: string,
  ): Promise<Listing[]> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.read");
    const requested = new Set(listingIds);
    if (requested.size === 0) return [];
    const result = await this.getVisibleListings({
      marketCode,
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
    });
    const byId = new Map(
      result.listings
        .filter((listing) => requested.has(listing.id))
        .map((listing) => [listing.id, listing] as const),
    );
    return [...requested].flatMap((id) => {
      const listing = byId.get(id);
      return listing ? [listing] : [];
    });
  }

  async searchListings(params: SearchFilters): Promise<{
    items: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.read");
    const result = await this.getVisibleListings(params);
    return {
      items: result.listings,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    };
  }

  async createListingDraft(
    marketCode = "FR",
    userId?: string,
  ): Promise<PublicationDraftState> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.create");
    const publicationService = await loadPublicationService();
    const existing = publicationService.getDraft(userId, marketCode);
    if (existing) return existing;

    const defaultDraft: PublicationDraftState = {
      marketCode,
      selectedMarkets: [marketCode],
      taxonomyNodeId: "",
      listingIntent: "SELL",
      title: "",
      description: "",
      condition: "very_good",
      attributes: {},
      photos: [],
      pricing: {
        priceModel: "fixed",
        amount: 0,
        currency:
          marketService.getEffectiveConfig(marketCode).localization
            .defaultCurrency,
        isNegotiable: false,
        isFreeDonation: false,
      },
      transaction: {
        allowContact: true,
        allowDirectPurchase: true,
        allowReservation: true,
        reservationType: "request",
      },
      fulfillment: {
        allowHandDelivery: true,
        allowParcelShipping: false,
        allowBulkyDelivery: false,
        allowSellerDelivery: false,
        allowStorePickup: false,
      },
      location: {
        city: "Paris",
        postalCode: "75001",
        countryCode: marketCode,
        hideExactAddress: true,
      },
      currentStep: 1,
      updatedAt: new Date().toISOString(),
    };

    publicationService.saveDraft(defaultDraft, userId);
    return defaultDraft;
  }

  async getListingDraft(
    marketCode = "FR",
  ): Promise<PublicationDraftState | null> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.create");
    const publicationService = await loadPublicationService();
    const user = storageService.getCurrentUser();
    return user
      ? publicationService.restoreGuestDraft(user, marketCode)
      : publicationService.getDraft(undefined, marketCode);
  }

  async uploadListingPhoto(file: File) {
    await simulateNetworkDelay();
    requireDemoCapability("listing.create");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size <= 0 ||
      file.size > 10 * 1024 * 1024
    ) {
      throw new Error(
        "La photo doit être un fichier JPEG, PNG ou WebP de 10 Mo maximum.",
      );
    }
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Impossible de lire la photo."));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    return { assetId: `demo-media-${file.name}-${file.size}`, url };
  }

  async getBulkImportTemplate(
    _locale: string,
  ): Promise<BulkListingImportTemplate> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.bulk_import");
    return { ...BULK_IMPORT_SAMPLE };
  }

  async parseBulkImportCsv(input: ParseBulkListingImportInput) {
    await simulateNetworkDelay();
    requireDemoCapability("listing.bulk_import");
    const lines = input.content.trim().split(/\r?\n/);
    const currency = marketService.getEffectiveConfig(input.marketCode)
      .localization.defaultCurrency;

    return lines.slice(1).flatMap((line, index) => {
      if (!line.trim()) return [];
      const columns = splitSemicolonRow(line);
      const title = columns[0] || "";
      const amount = Number.parseFloat(columns[3] || "0");
      const validationErrorCode = !title
        ? ("TITLE_REQUIRED" as const)
        : title.length < 5
          ? ("TITLE_TOO_SHORT" as const)
          : !Number.isFinite(amount) || amount <= 0
            ? ("PRICE_INVALID" as const)
            : undefined;

      return [
        {
          id: `bulk-row-${index + 1}`,
          title,
          description: columns[8] || "",
          categorySlug: columns[1] || "home_garden",
          subCategorySlug: columns[2] || "furniture",
          price: {
            amountMinor: Math.round(
              (Number.isFinite(amount) ? amount : 0) * 100,
            ),
            currency,
          },
          condition: columns[4] || "very_good",
          stock: Math.max(1, Number.parseInt(columns[5] || "1", 10) || 1),
          city: columns[6] || input.defaultCity,
          postalCode: columns[7] || input.defaultPostalCode,
          isValid: validationErrorCode === undefined,
          validationErrorCode,
        },
      ];
    });
  }

  async publishBulkListings(
    input: PublishBulkListingsInput,
  ): Promise<Listing[]> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.bulk_import");
    const seller = storageService.getCurrentUser();
    if (!seller || seller.id !== input.sellerId) {
      throw new Error(
        "Le compte vendeur actif ne correspond pas à cet import.",
      );
    }

    const validRows = input.rows.filter((row) => row.isValid);
    return Promise.all(
      validRows.map((row) => {
        return listingRepository.createListing({
          title: row.title,
          description:
            row.description ||
            `Article importé depuis le catalogue professionnel de ${seller.companyName || seller.name}.`,
          price: row.price.amountMinor / 100,
          isNegotiable: false,
          isFreeDonation: false,
          categorySlug: row.categorySlug,
          subCategorySlug: row.subCategorySlug,
          categoryLabel: taxonomyIdentityLabel(row.categorySlug),
          subCategoryLabel: taxonomyIdentityLabel(row.subCategorySlug),
          condition: row.condition as Listing["condition"],
          sellerId: seller.id,
          sellerName: seller.companyName || seller.name,
          sellerType: "pro",
          sellerAvatarUrl: seller.avatarUrl,
          sellerRating: seller.rating ?? 0,
          sellerReviewCount: seller.reviewCount || 0,
          sellerIsVerified: true,
          sellerCity: row.city,
          sellerPostalCode: row.postalCode,
          city: row.city,
          postalCode: row.postalCode,
          department: seller.department || "",
          region: seller.region || "",
          photos: [],
          coverImageUrl: "",
          deliveryOptions: [
            { type: "hand_delivery", available: true, price: 0 },
            {
              type: "home_delivery",
              available: true,
              price: 14.9,
              courierName: "Colissimo",
            },
          ],
          isOnlinePaymentAvailable: true,
          isReservable: true,
          attributes: { stock_quantity: row.stock },
          status: "active",
          expiresAt: "",
        });
      }),
    );
  }

  async saveListingDraft(
    draft: PublicationDraftState,
    userId?: string,
  ): Promise<void> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.create");
    const publicationService = await loadPublicationService();
    publicationService.saveDraft(
      draft,
      userId ?? storageService.getCurrentUser()?.id,
    );
  }

  async publishListing(
    draft: PublicationDraftState,
    sellerId: string,
  ): Promise<Listing> {
    await simulateNetworkDelay();
    const currentUser = requireDemoCapability("listing.publish");
    if (!currentUser || currentUser.id !== sellerId) {
      throw new Error("Le compte vendeur actif ne correspond pas à l’annonce.");
    }
    const allUsers = Object.values(storageService.getUsers());
    const user = allUsers.find((u) => u.id === sellerId) || {
      id: sellerId,
      name: "Vendeur Shongre",
      email: "vendeur@shongre.com",
      role: "individual_seller",
      sellerType: "individual",
      status: "active",
      isVerified: true,
      city: "Paris",
      postalCode: "75001",
    };
    const publicationService = await loadPublicationService();
    return publicationService.publishListing(draft, user as any);
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.update.own");
    const updated = await listingRepository.updateListing(id, updates);
    if (!updated) throw new Error(`Listing with ID ${id} not found.`);
    return updated;
  }

  async markListingSold(id: string): Promise<Listing> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.update.own");
    return listingRepository.updateListingStatus(id, "sold");
  }

  async deleteListing(id: string): Promise<boolean> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.delete.own");
    return listingRepository.deleteListing(id);
  }

  async setFavorite(
    listingId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean> {
    await simulateNetworkDelay();
    requireDemoCapability("favorite.manage.own");
    const current = storageService
      .getFavorites(undefined, marketCode)
      .includes(listingId);
    if (current !== isFavorite)
      storageService.toggleFavorite(listingId, undefined, marketCode);
    return isFavorite;
  }

  async getFavoriteCollection(marketCode: string) {
    await simulateNetworkDelay();
    requireDemoCapability("favorite.manage.own");
    const accountId = storageService.getCurrentUser()?.id;
    const deliveryListingIds = accountId
      ? demoDeliveryFavoritesStore
          .list(accountId, marketCode)
          .map(deliveryDiscoveryListingId)
      : [];
    const listingIds = [
      ...storageService.getFavorites(undefined, marketCode),
      ...deliveryListingIds,
    ];
    const targets = new Set(listingIds);
    const result = await this.getVisibleListings({
      marketCode,
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
    });
    const byId = new Map(
      result.listings
        .filter((listing) => targets.has(listing.id))
        .map((listing) => [listing.id, listing] as const),
    );
    const visibleListingIds = listingIds.filter((id) => byId.has(id));
    return {
      listingIds: visibleListingIds,
      listings: visibleListingIds.flatMap((id) => {
        const listing = byId.get(id);
        return listing ? [listing] : [];
      }),
    };
  }
}

export const demoListingsService = new DemoListingsService();
