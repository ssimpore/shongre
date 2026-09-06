import { Listing, SearchFilters, ListingStatus } from "../types";
import { storageService } from "../services/storage.service";
import {
  authorizationService,
  EntitlementLimitError,
} from "../security/authorization.service";
import { auditService } from "../security/audit.service";
import {
  expandSearchQuery,
  searchTextIncludes,
} from "../utilities/search-text";
import { demoVerticalDiscoveryStore } from "../domains/discovery/demo-vertical-discovery.store";
import { DEFAULT_MARKET_CODE } from "../configuration/market-baseline";
import { getCountryConfig } from "@shongre/contracts";
import { majorToMinorAmount } from "@shongre/shared/money";

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
  moderateListing(
    id: string,
    action: "hide" | "approve" | "delete",
    reason?: string,
  ): Promise<Listing | boolean>;
  deleteListing(id: string): Promise<boolean>;
  getDealsListings(): Promise<Listing[]>;
  getListingsBySeller(sellerId: string): Promise<Listing[]>;
  getSimilarListings(
    listingId: string,
    categorySlug: string,
  ): Promise<Listing[]>;
  incrementViews(listingId: string): Promise<void>;
  decrementStock(listingId: string, quantity: number): Promise<Listing>;
}

function searchableAttributeText(listing: Listing): string {
  return Object.values(listing.attributes || {})
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(
      (value) =>
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean",
    )
    .join(" ");
}

function matchesFacetValue(actual: unknown, criterion: unknown): boolean {
  const requested = String(criterion);
  const threshold = requested.match(/^(\d+)_plus$/)?.[1];
  if (threshold) {
    const numericActual = Number(actual);
    return Number.isFinite(numericActual) && numericActual >= Number(threshold);
  }
  return String(actual) === requested;
}

type ListingMarketPublication = NonNullable<
  Listing["marketPublications"]
>[number];

/**
 * Projects the market-owned commercial fields before filtering and sorting.
 * The generic demo inventory stores one listing with several publication
 * records; returning the root price here would make the same result display and
 * sort differently from the selected market's authoritative publication.
 */
function projectMarketPublication(
  listing: Listing,
  publication: ListingMarketPublication,
): Listing {
  const hasCustomPrice =
    typeof publication.customPrice === "number" &&
    Number.isFinite(publication.customPrice) &&
    publication.customPrice >= 0;
  const price = hasCustomPrice ? publication.customPrice! : listing.price;
  const currency = (
    publication.currency ||
    listing.currency ||
    getCountryConfig(publication.marketCode)?.currency
  )?.toUpperCase();
  const pricePresentation = listing.pricePresentation
    ? {
        ...listing.pricePresentation,
        currency: currency || listing.pricePresentation.currency,
        ...(hasCustomPrice &&
        listing.pricePresentation.visibility === "public" &&
        currency
          ? {
              minimumAmountMinor: majorToMinorAmount(price, currency),
              maximumAmountMinor: majorToMinorAmount(price, currency),
            }
          : {}),
      }
    : undefined;

  return {
    ...listing,
    price,
    currency,
    pricePresentation,
    marketCode: publication.marketCode.toUpperCase(),
    // A publication date belongs to this market publication. Leaving it absent
    // is more accurate than borrowing the listing creation or another market's
    // publication date.
    publishedAt: publication.publishedAt,
  };
}

class MockListingRepository implements IListingRepository {
  private async getCanonicalInventory(): Promise<Listing[]> {
    // Legacy browser snapshots need the full alias graph, but application
    // chrome only needs raw storage. Defer the generated taxonomy until a
    // listing service is actually asked for inventory.
    const { normalizeListingTaxonomyIdentity } =
      await import("../domains/taxonomy/taxonomy.identity");
    const listingsById = new Map<string, Listing>(
      storageService
        .getListings()
        .map((listing) => [
          listing.id,
          { ...listing, ...normalizeListingTaxonomyIdentity(listing) },
        ]),
    );

    // Specialized verticals are authoritative when a stale browser-local
    // generic snapshot happens to use the same listing id.
    demoVerticalDiscoveryStore
      .getListings()
      .forEach((listing) => listingsById.set(listing.id, listing));

    return Array.from(listingsById.values());
  }

  async getListings(filters: SearchFilters = {}): Promise<{
    listings: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    let list = (await this.getCanonicalInventory()).filter(
      (listing) => listing.status === "active",
    );

    // Query text
    if (filters.query && filters.query.trim()) {
      // Accent-folded on both sides: "velo" has to find "Vélo", and "cafe" has
      // to find "Machine à Café". See utilities/search-text.
      const queries = expandSearchQuery(filters.query);
      list = list.filter((item) =>
        queries.some(
          (query) =>
            searchTextIncludes(item.title, query) ||
            searchTextIncludes(item.description, query) ||
            searchTextIncludes(item.categoryLabel, query) ||
            searchTextIncludes(item.subCategoryLabel, query) ||
            searchTextIncludes(item.city, query) ||
            searchTextIncludes(item.sellerName, query) ||
            searchTextIncludes(item.publisherOrganizationName || "", query) ||
            searchTextIncludes(searchableAttributeText(item), query),
        ),
      );
    }

    // Market Code filter (supports multi-market listings)
    if (
      filters.marketCode &&
      filters.marketCode !== "all" &&
      filters.marketCode !== "*"
    ) {
      const mCode = filters.marketCode.toUpperCase();
      list = list.flatMap((item) => {
        // 1. Check marketPublications if present
        if (item.marketPublications && item.marketPublications.length > 0) {
          const publication = item.marketPublications.find(
            (p) =>
              p.marketCode.toUpperCase() === mCode && p.status === "active",
          );
          return publication
            ? [projectMarketPublication(item, publication)]
            : [];
        }
        // 2. Check marketCodes array
        if (item.marketCodes && item.marketCodes.length > 0) {
          return item.marketCodes.some((code) => code.toUpperCase() === mCode)
            ? [item]
            : [];
        }
        // Legacy rows are usable only when they carry an explicit primary market.
        return item.marketCode?.toUpperCase() === mCode ? [item] : [];
      });
    }

    // Category with taxonomy normalization and alias resolution
    if (filters.categorySlug && filters.categorySlug !== "all") {
      const { isTaxonomyV4DescendantOf, resolveCanonicalTaxonomyIdentity } =
        await import("../domains/taxonomy/taxonomy.identity");
      const catSlugOrId = filters.categorySlug.toLowerCase();
      const requestedCategoryId =
        resolveCanonicalTaxonomyIdentity(catSlugOrId)?.id || catSlugOrId;

      list = list.filter((item) => {
        const itemCat = (item.categorySlug || "").toLowerCase();
        const itemSubCat = (item.subCategorySlug || "").toLowerCase();
        const itemNode =
          resolveCanonicalTaxonomyIdentity(itemSubCat) ||
          resolveCanonicalTaxonomyIdentity(itemCat);
        if (itemNode && isTaxonomyV4DescendantOf(itemNode.id, catSlugOrId)) {
          return true;
        }
        return (
          itemCat === catSlugOrId ||
          itemSubCat === catSlugOrId ||
          itemCat.startsWith(`${requestedCategoryId}.`) ||
          itemSubCat.startsWith(`${requestedCategoryId}.`)
        );
      });
    }

    // Subcategory with alias normalization
    if (filters.subCategorySlug) {
      const { isTaxonomyV4DescendantOf, resolveCanonicalTaxonomyIdentity } =
        await import("../domains/taxonomy/taxonomy.identity");
      const subSlugOrId = filters.subCategorySlug.toLowerCase();
      const requestedSubCategoryId =
        resolveCanonicalTaxonomyIdentity(subSlugOrId)?.id || subSlugOrId;

      list = list.filter((item) => {
        const itemSubCat = (item.subCategorySlug || "").toLowerCase();
        const itemNode = resolveCanonicalTaxonomyIdentity(itemSubCat);
        if (itemNode && isTaxonomyV4DescendantOf(itemNode.id, subSlugOrId)) {
          return true;
        }
        return (
          itemSubCat === subSlugOrId ||
          itemSubCat.startsWith(`${requestedSubCategoryId}.`)
        );
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
      const { taxonomyService } =
        await import("../domains/taxonomy/taxonomy.service");
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
            return criterion.some((value) =>
              actualValues.some((actualValue) =>
                matchesFacetValue(actualValue, value),
              ),
            );
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
          return matchesFacetValue(actual, criterion);
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
        // The repository only retrieves candidates. The shared discovery
        // engine owns organic relevance and sponsored insertion.
        return (
          new Date(
            b.organicFreshnessAt || b.publishedAt || b.createdAt,
          ).getTime() -
          new Date(
            a.organicFreshnessAt || a.publishedAt || a.createdAt,
          ).getTime()
        );
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
    const list = await this.getCanonicalInventory();
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
    const activeMarket =
      storageService.getActiveMarketCode() || DEFAULT_MARKET_CODE;
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

  async getDealsListings(): Promise<Listing[]> {
    const list = (await this.getCanonicalInventory()).filter(
      (listing) => listing.status === "active",
    );
    return list
      .filter((l) => l.originalPrice && l.originalPrice > l.price)
      .slice(0, 6);
  }

  async getListingsBySeller(sellerId: string): Promise<Listing[]> {
    return (await this.getCanonicalInventory()).filter(
      (listing) => listing.sellerId === sellerId,
    );
  }

  async getSimilarListings(
    listingId: string,
    categorySlug: string,
  ): Promise<Listing[]> {
    return (await this.getCanonicalInventory())
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
      if (!demoVerticalDiscoveryStore.hasListing(listingId)) {
        storageService.saveListing(listing);
      }
    }
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
    if (listing.sellerId !== currentUser.id) {
      authorizationService.assertCan(currentUser, "listing.moderate");
    }

    const normalizedCodes = Array.from(
      new Set(marketCodes.map((c) => c.toUpperCase())),
    );
    const primary =
      listing.marketCode || normalizedCodes[0] || DEFAULT_MARKET_CODE;

    const pubs =
      marketPublications && marketPublications.length > 0
        ? marketPublications
        : normalizedCodes.map((mCode) => ({
            marketCode: mCode,
            status: "active" as const,
            isPrimary: mCode === primary,
            publishedAt: new Date().toISOString(),
            currency: getCountryConfig(mCode)?.currency || listing.currency,
            complianceChecked: true,
          }));

    listing.marketCodes = normalizedCodes;
    listing.marketPublications = pubs;
    listing.updatedAt = new Date().toISOString();

    storageService.saveListing(listing);

    auditService.logEvent({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: (currentUser.staffRole || currentUser.role) as any,
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
