import { isProSeller } from "../domains/user/user.domain";
import { Listing, SearchFilters, ListingStatus } from "../types";
import { storageService } from "../services/storage.service";
import {
  authorizationService,
  EntitlementLimitError,
} from "../security/authorization.service";
import { auditService } from "../security/audit.service";
import { taxonomyService } from "../domains/taxonomy/taxonomy.service";
import { TaxonomyMigration } from "../domains/taxonomy/taxonomy.migration";
import {
  normalizeSearchText,
  searchTextIncludes,
} from "../utilities/search-text";

export interface IListingRepository {
  getListings(filters?: SearchFilters): Promise<{
    listings: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  getListingById(id: string): Promise<Listing | null>;
  createListing(
    listing: Omit<
      Listing,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "viewsCount"
      | "favoritesCount"
      | "contactCount"
    >,
  ): Promise<Listing>;
  updateListing(id: string, updates: Partial<Listing>): Promise<Listing>;
  updateListingStatus(id: string, status: ListingStatus): Promise<Listing>;
  updateListingMarkets(
    id: string,
    marketCodes: string[],
    marketPublications?: any[],
  ): Promise<Listing>;
  getListingsByMarket(marketCode: string): Promise<Listing[]>;
  boostListing(
    id: string,
    boostType:
      "urgent" | "highlight" | "top_of_list" | "gallery_boost" | "spotlight",
  ): Promise<Listing>;
  moderateListing(
    id: string,
    action: "hide" | "approve" | "delete",
    reason?: string,
  ): Promise<Listing | boolean>;
  deleteListing(id: string): Promise<boolean>;
  getFeaturedListings(): Promise<Listing[]>;
  getDealsListings(): Promise<Listing[]>;
  getListingsBySeller(sellerId: string): Promise<Listing[]>;
  getSimilarListings(
    listingId: string,
    categorySlug: string,
  ): Promise<Listing[]>;
  incrementViews(listingId: string): Promise<void>;
  toggleFavorite(listingId: string): Promise<boolean>;
  getFavorites(): Promise<Listing[]>;
  decrementStock(listingId: string, quantity: number): Promise<Listing>;
}

export class MockListingRepository implements IListingRepository {
  async getListings(filters: SearchFilters = {}): Promise<{
    listings: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    let list = storageService
      .getListings()
      .filter((l) => l.status === "active");

    // Query text
    if (filters.query && filters.query.trim()) {
      // Accent-folded on both sides: "velo" has to find "Vélo", and "cafe" has
      // to find "Machine à Café". See utilities/search-text.
      const q = normalizeSearchText(filters.query);
      list = list.filter(
        (item) =>
          searchTextIncludes(item.title, q) ||
          searchTextIncludes(item.description, q) ||
          searchTextIncludes(item.categoryLabel, q) ||
          searchTextIncludes(item.subCategoryLabel, q) ||
          searchTextIncludes(item.city, q),
      );
    }

    // Market Code filter (supports multi-market listings)
    if (
      filters.marketCode &&
      filters.marketCode !== "all" &&
      filters.marketCode !== "*"
    ) {
      const mCode = filters.marketCode.toUpperCase();
      list = list.filter((item) => {
        // 1. Check marketPublications if present
        if (item.marketPublications && item.marketPublications.length > 0) {
          return item.marketPublications.some(
            (p) =>
              p.marketCode.toUpperCase() === mCode && p.status === "active",
          );
        }
        // 2. Check marketCodes array
        if (item.marketCodes && item.marketCodes.length > 0) {
          return item.marketCodes.some((code) => code.toUpperCase() === mCode);
        }
        // 3. Fallback to primary marketCode or FR
        return (item.marketCode || "FR").toUpperCase() === mCode;
      });
    }

    // Category with taxonomy normalization and alias resolution
    if (filters.categorySlug && filters.categorySlug !== "all") {
      const catSlugOrId = filters.categorySlug.toLowerCase();
      const catNode = TaxonomyMigration.resolveCanonicalNode(catSlugOrId);
      const matchedNodeIds = new Set(
        catNode
          ? [catNode.id, ...taxonomyService.getDescendants(catNode.id).map((node) => node.id)]
          : [],
      );

      list = list.filter((item) => {
        const itemCat = (item.categorySlug || "").toLowerCase();
        const itemSubCat = (item.subCategorySlug || "").toLowerCase();
        const itemNode =
          TaxonomyMigration.resolveCanonicalNode(itemSubCat) ||
          TaxonomyMigration.resolveCanonicalNode(itemCat);
        if (itemNode && matchedNodeIds.size > 0) return matchedNodeIds.has(itemNode.id);
        return itemCat === catSlugOrId || itemSubCat === catSlugOrId;
      });
    }

    // Subcategory with alias normalization
    if (filters.subCategorySlug) {
      const subSlugOrId = filters.subCategorySlug.toLowerCase();
      const subNode = TaxonomyMigration.resolveCanonicalNode(subSlugOrId);
      const matchedNodeIds = new Set(
        subNode
          ? [subNode.id, ...taxonomyService.getDescendants(subNode.id).map((node) => node.id)]
          : [],
      );

      list = list.filter((item) => {
        const itemSubCat = (item.subCategorySlug || "").toLowerCase();
        const itemNode = TaxonomyMigration.resolveCanonicalNode(itemSubCat);
        if (itemNode && matchedNodeIds.size > 0) return matchedNodeIds.has(itemNode.id);
        return itemSubCat === subSlugOrId;
      });
    }

    // City / Location & Radius filter (skip if "Toute la France" or "Tout le pays")
    if (
      filters.city &&
      !filters.city.startsWith("Tout") &&
      !filters.city.startsWith("Toute")
    ) {
      const cityQuery = filters.city.toLowerCase().trim();
      const postalPrefix = (filters.postalCode || "").slice(0, 2);
      const radius = filters.radiusKm || 0;

      list = list.filter((item) => {
        const itemCity = (item.city || "").toLowerCase();
        const itemPostal = item.postalCode || "";
        const itemDept = (item.department || "").toLowerCase();
        const itemRegion = (item.region || "").toLowerCase();

        // Exact city match
        if (itemCity.includes(cityQuery)) return true;
        if (postalPrefix && itemPostal.startsWith(postalPrefix)) return true;

        // Radius expansion (surrounding department / region)
        if (
          radius >= 30 &&
          (itemDept.includes(cityQuery) || itemRegion.includes(cityQuery))
        ) {
          return true;
        }
        if (radius >= 50 && postalPrefix) {
          const itemDeptNum = parseInt(itemPostal.slice(0, 2), 10);
          const filterDeptNum = parseInt(postalPrefix, 10);
          if (
            !isNaN(itemDeptNum) &&
            !isNaN(filterDeptNum) &&
            Math.abs(itemDeptNum - filterDeptNum) <= 2
          ) {
            return true;
          }
        }
        if (radius >= 100) {
          return true;
        }

        return false;
      });
    }

    // Price range
    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      list = list.filter((item) => item.price >= (filters.minPrice || 0));
    }
    if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
      list = list.filter((item) => item.price <= (filters.maxPrice || 0));
    }

    // Seller type
    if (filters.sellerType && filters.sellerType !== "all") {
      list = list.filter((item) => item.sellerType === filters.sellerType);
    }

    // Delivery available
    if (filters.deliveryAvailable) {
      list = list.filter((item) =>
        item.deliveryOptions.some(
          (d) => d.available && d.type !== "hand_delivery",
        ),
      );
    }

    // Online payment
    if (filters.onlinePaymentAvailable) {
      list = list.filter((item) => item.isOnlinePaymentAvailable);
    }

    // Only Deals
    if (filters.onlyDeals) {
      list = list.filter(
        (item) => item.originalPrice && item.originalPrice > item.price,
      );
    }

    // Conditions
    if (filters.conditions && filters.conditions.length > 0) {
      list = list.filter((item) =>
        filters.conditions!.includes(item.condition),
      );
    }

    // Dynamic taxonomy facets use the same attribute keys as publication and
    // detail pages. Arrays are treated as overlap filters; range objects use
    // inclusive bounds and scalar values use exact matching.
    if (filters.attributes) {
      Object.entries(filters.attributes).forEach(([key, criterion]) => {
        const attribute = taxonomyService.getAttribute(key);
        const attributeValue = (item: Listing) => {
          const code = attribute?.code || key;
          return item.attributes?.[code] ?? item.attributes?.[key];
        };

        list = list.filter((item) => {
          const actual = attributeValue(item);
          if (actual === undefined || actual === null) return false;
          if (Array.isArray(criterion)) {
            const actualValues = Array.isArray(actual) ? actual : [actual];
            return criterion.some((value) => actualValues.includes(value));
          }
          if (
            typeof criterion === "object" &&
            criterion !== null &&
            !Array.isArray(criterion)
          ) {
            const range = criterion as { min?: number; max?: number };
            const numericActual = Number(actual);
            return (
              Number.isFinite(numericActual) &&
              (range.min === undefined || numericActual >= range.min) &&
              (range.max === undefined || numericActual <= range.max)
            );
          }
          return String(actual) === String(criterion);
        });
      });
    }

    // Sorting
    const sort = filters.sortBy || "date_desc";
    list.sort((a, b) => {
      if (sort === "date_desc") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (sort === "price_asc") {
        return a.price - b.price;
      }
      if (sort === "price_desc") {
        return b.price - a.price;
      }
      if (sort === "distance" && filters.city) {
        const cityQuery = filters.city.toLowerCase();
        const aExact = a.city.toLowerCase().includes(cityQuery) ? 1 : 0;
        const bExact = b.city.toLowerCase().includes(cityQuery) ? 1 : 0;
        return bExact - aExact;
      }
      if (sort === "relevance") {
        return (b.isBoosted ? 1 : 0) - (a.isBoosted ? 1 : 0);
      }
      return 0;
    });

    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const paginated = list.slice(offset, offset + limit);

    return { listings: paginated, total, page, totalPages };
  }

  async getListingById(id: string): Promise<Listing | null> {
    const list = storageService.getListings();
    return list.find((l) => l.id === id) || null;
  }

  async createListing(
    input: Omit<
      Listing,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "viewsCount"
      | "favoritesCount"
      | "contactCount"
    >,
  ): Promise<Listing> {
    const currentUser = storageService.getCurrentUser();
    authorizationService.assertCan(currentUser, "listing.create");

    // Check active listings quota
    const currentActiveListings = storageService
      .getListings()
      .filter((l) => l.sellerId === currentUser?.id && l.status === "active");
    const maxQuota = authorizationService.getMaxListingsQuota(currentUser);
    if (currentActiveListings.length >= maxQuota) {
      throw new EntitlementLimitError(
        `Limite de votre formule atteinte (${maxQuota} annonces actives maximum). Veuillez souscrire à une formule supérieure ou archiver une annonce existante.`,
      );
    }

    const now = new Date().toISOString();
    const activeMarket = storageService.getActiveMarketCode() || "FR";
    const newListing: Listing = {
      ...input,
      marketCode: (input as any).marketCode || activeMarket,
      id: `list-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
      viewsCount: 1,
      favoritesCount: 0,
      contactCount: 0,
    };

    storageService.saveListing(newListing);
    return newListing;
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    const listing = await this.getListingById(id);
    if (!listing) {
      throw new Error(`Listing ${id} introuvable`);
    }

    const currentUser = storageService.getCurrentUser();
    const isModerator = authorizationService.can(
      currentUser,
      "listing.moderate",
    );

    if (!isModerator) {
      authorizationService.assertCan(
        currentUser,
        "listing.update.own",
        listing,
      );
    }

    const updated: Listing = {
      ...listing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    storageService.saveListing(updated);
    return updated;
  }

  async updateListingStatus(
    id: string,
    status: ListingStatus,
  ): Promise<Listing> {
    return this.updateListing(id, { status });
  }

  async boostListing(
    id: string,
    boostType:
      "urgent" | "highlight" | "top_of_list" | "gallery_boost" | "spotlight",
  ): Promise<Listing> {
    const listing = await this.getListingById(id);
    if (!listing) throw new Error("Annonce non trouvée");

    const currentUser = storageService.getCurrentUser();
    authorizationService.assertCan(currentUser, "listing.promote", listing);

    const boostExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    return this.updateListing(id, {
      isBoosted: true,
      boostType,
      boostExpiresAt,
    });
  }

  async moderateListing(
    id: string,
    action: "hide" | "approve" | "delete",
    reason?: string,
  ): Promise<Listing | boolean> {
    const currentUser = storageService.getCurrentUser();
    authorizationService.assertCan(currentUser, "listing.moderate");

    const listing = await this.getListingById(id);
    if (!listing) throw new Error("Annonce introuvable");

    if (action === "delete") {
      const deleted = await this.deleteListing(id);
      auditService.logEvent({
        actorId: currentUser!.id,
        actorName: currentUser!.name,
        actorRole: currentUser!.primaryRole || currentUser!.role,
        targetId: listing.id,
        targetName: listing.title,
        action: "listing_moderated",
        details: `Suppression définitive de l'annonce pour motif : "${reason || "Infraction aux règles"}".`,
      });
      return deleted;
    }

    const nextStatus: ListingStatus =
      action === "hide" ? "pending_review" : "active";
    const updated = await this.updateListing(id, { status: nextStatus });

    auditService.logEvent({
      actorId: currentUser!.id,
      actorName: currentUser!.name,
      actorRole: currentUser!.primaryRole || currentUser!.role,
      targetId: listing.id,
      targetName: listing.title,
      action: action === "hide" ? "listing_hidden" : "listing_restored",
      details: `Modération [${action.toUpperCase()}] de l'annonce "${listing.title}". Motif : ${reason || "Vérification de sécurité"}.`,
    });

    return updated;
  }

  async deleteListing(id: string): Promise<boolean> {
    const listing = await this.getListingById(id);
    if (listing) {
      const currentUser = storageService.getCurrentUser();
      const isModerator = authorizationService.can(
        currentUser,
        "listing.moderate",
      );
      if (!isModerator) {
        authorizationService.assertCan(
          currentUser,
          "listing.delete.own",
          listing,
        );
      }
    }

    const list = storageService.getListings().filter((l) => l.id !== id);
    storageService.saveListings(list);
    return true;
  }

  async getFeaturedListings(): Promise<Listing[]> {
    const list = storageService
      .getListings()
      .filter((l) => l.status === "active");
    return list.filter((l) => l.isBoosted || isProSeller(l)).slice(0, 6);
  }

  async getDealsListings(): Promise<Listing[]> {
    const list = storageService
      .getListings()
      .filter((l) => l.status === "active");
    return list
      .filter((l) => l.originalPrice && l.originalPrice > l.price)
      .slice(0, 6);
  }

  async getListingsBySeller(sellerId: string): Promise<Listing[]> {
    return storageService.getListings().filter((l) => l.sellerId === sellerId);
  }

  async getSimilarListings(
    listingId: string,
    categorySlug: string,
  ): Promise<Listing[]> {
    return storageService
      .getListings()
      .filter(
        (l) =>
          l.id !== listingId &&
          l.categorySlug === categorySlug &&
          l.status === "active",
      )
      .slice(0, 4);
  }

  async incrementViews(listingId: string): Promise<void> {
    const listing = await this.getListingById(listingId);
    if (listing) {
      listing.viewsCount += 1;
      storageService.saveListing(listing);
    }
  }

  async toggleFavorite(listingId: string): Promise<boolean> {
    const currentUser = storageService.getCurrentUser();
    authorizationService.assertCan(currentUser, "favorite.manage.own");
    const isFav = storageService.toggleFavorite(listingId);
    const listing = await this.getListingById(listingId);
    if (listing) {
      listing.favoritesCount = Math.max(
        0,
        listing.favoritesCount + (isFav ? 1 : -1),
      );
      storageService.saveListing(listing);
    }
    return isFav;
  }

  async getFavorites(): Promise<Listing[]> {
    const favIds = storageService.getFavorites();
    const all = storageService.getListings();
    return all.filter((l) => favIds.includes(l.id));
  }

  async updateListingMarkets(
    id: string,
    marketCodes: string[],
    marketPublications?: any[],
  ): Promise<Listing> {
    const listing = await this.getListingById(id);
    if (!listing) throw new Error("Annonce non trouvée");

    const currentUser = storageService.getCurrentUser();
    if (!currentUser) throw new Error("Authentification requise");
    if (
      listing.sellerId !== currentUser.id &&
      currentUser.role !== "admin" &&
      currentUser.role !== "super_admin"
    ) {
      authorizationService.assertCan(currentUser, "listing.moderate");
    }

    const normalizedCodes = Array.from(
      new Set(marketCodes.map((c) => c.toUpperCase())),
    );
    const primary = listing.marketCode || normalizedCodes[0] || "FR";

    const pubs =
      marketPublications && marketPublications.length > 0
        ? marketPublications
        : normalizedCodes.map((mCode) => ({
            marketCode: mCode,
            status: "active" as const,
            isPrimary: mCode === primary,
            publishedAt: new Date().toISOString(),
            currency: mCode === "CH" ? "CHF" : "EUR",
            complianceChecked: true,
          }));

    listing.marketCodes = normalizedCodes;
    listing.marketPublications = pubs;
    listing.updatedAt = new Date().toISOString();

    storageService.saveListing(listing);

    auditService.logEvent({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role as any,
      targetId: id,
      targetName: listing.title,
      action: "listing_moderated",
      details: `Marchés de diffusion mis à jour pour l'annonce #${id} : [${normalizedCodes.join(", ")}]`,
      market: primary,
    });

    return listing;
  }

  async getListingsByMarket(marketCode: string): Promise<Listing[]> {
    const res = await this.getListings({ marketCode, limit: 1000 });
    return res.listings;
  }

  async decrementStock(listingId: string, quantity: number): Promise<Listing> {
    const listing = await this.getListingById(listingId);
    if (!listing) throw new Error("Annonce non trouvée");

    const currentStock = listing.stock ?? 1;
    const newStock = Math.max(0, currentStock - quantity);

    listing.stock = newStock;
    if (newStock === 0) {
      listing.status = "sold";
    }
    listing.updatedAt = new Date().toISOString();

    storageService.saveListing(listing);
    return listing;
  }
}

export const listingRepository: IListingRepository =
  new MockListingRepository();
