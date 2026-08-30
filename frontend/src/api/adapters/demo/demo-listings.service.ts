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
import { publicationService } from "../../../domains/publication/publication.service";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { marketService } from "../../../domains/market/market.service";
import { taxonomyService } from "../../../domains/taxonomy/taxonomy.service";
import { requireDemoCapability } from "./demo-authorization";

const BULK_IMPORT_SAMPLE: BulkListingImportTemplate = {
  fileName: "modele_import_annonces_shongre.csv",
  content: `Titre;Categorie;SousCategorie;Prix;Etat;Stock;Ville;CodePostal;Description
Table basse chêne massif;home_garden;furniture;180;very_good;2;Lyon;69002;Superbe table basse en chêne massif huilé, pieds métal noir.
Lot 4 chaises scandinaves;home_garden;furniture;120;new_without_tag;4;Lyon;69002;Chaises design scandinave tissu gris chiné neuves.
Lampadaire trépied vintage;home_garden;furniture;65;very_good;1;Lyon;69002;Lampadaire esprit projecteur de cinéma avec variateur.
Miroir mural doré baroque;home_garden;furniture;95;good;1;Lyon;69002;Grand miroir moulure dorée 120x80cm.`,
};

const BULK_IMPORT_COVER_URL =
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80";

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
  async getListings(
    filter?: SearchFilters,
  ): Promise<{ listings: Listing[]; total: number }> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.read");
    return listingRepository.getListings(filter);
  }

  async getListingById(id: string): Promise<Listing | null> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.read");
    return listingRepository.getListingById(id);
  }

  async searchListings(params: SearchFilters): Promise<{
    items: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.read");
    const res = await listingRepository.getListings(params);
    return {
      items: res.listings,
      total: res.total,
      page: res.page,
      totalPages: res.totalPages,
    };
  }

  async createListingDraft(userId?: string): Promise<PublicationDraftState> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.create");
    const existing = publicationService.getDraft(userId);
    if (existing) return existing;

    const defaultDraft: PublicationDraftState = {
      marketCode: "FR",
      selectedMarkets: [marketService.getDefaultMarket().code],
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
        currency: "EUR",
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
        countryCode: "FR",
        hideExactAddress: true,
      },
      currentStep: 1,
      updatedAt: new Date().toISOString(),
    };

    publicationService.saveDraft(defaultDraft, userId);
    return defaultDraft;
  }

  async getListingDraft(): Promise<PublicationDraftState | null> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.create");
    return publicationService.getDraft(storageService.getCurrentUser()?.id);
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
        const category = taxonomyService.getNodeBySlug(row.categorySlug);
        const subCategory = taxonomyService.getNodeBySlug(row.subCategorySlug);
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
          categoryLabel: category?.label || category?.name || row.categorySlug,
          subCategoryLabel:
            subCategory?.label || subCategory?.name || row.subCategorySlug,
          condition: row.condition as Listing["condition"],
          sellerId: seller.id,
          sellerName: seller.companyName || seller.name,
          sellerType: "pro",
          sellerAvatarUrl: seller.avatarUrl,
          sellerRating: seller.rating || 5,
          sellerReviewCount: seller.reviewCount || 0,
          sellerIsVerified: true,
          sellerCity: row.city,
          sellerPostalCode: row.postalCode,
          city: row.city,
          postalCode: row.postalCode,
          department: seller.department || "",
          region: seller.region || "",
          photos: [
            {
              id: `bulk-media-${row.id}`,
              url: BULK_IMPORT_COVER_URL,
              isCover: true,
            },
          ],
          coverImageUrl: BULK_IMPORT_COVER_URL,
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
    publicationService.saveDraft(draft, userId);
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
    return publicationService.publishListing(draft, user as any);
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.update.own");
    const updated = await listingRepository.updateListing(id, updates);
    if (!updated) throw new Error(`Listing with ID ${id} not found.`);
    return updated;
  }

  async deleteListing(id: string): Promise<boolean> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.delete.own");
    return listingRepository.deleteListing(id);
  }

  async toggleFavorite(listingId: string): Promise<boolean> {
    await simulateNetworkDelay();
    requireDemoCapability("favorite.manage.own");
    return storageService.toggleFavorite(listingId);
  }

  async getFavorites(): Promise<string[]> {
    await simulateNetworkDelay();
    requireDemoCapability("favorite.manage.own");
    return storageService.getFavorites();
  }
}

export const demoListingsService = new DemoListingsService();
