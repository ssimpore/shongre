import {
  Listing,
  SearchFilters,
  DeliveryType,
} from "../../../shared/types/index.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { requireMarketCode } from "../../../shared/market/market-code.js";
import { databaseFailure } from "./repository-error.js";

export interface IListingRepository {
  findById(id: string): Promise<Listing | null>;
  findPublicById(id: string): Promise<Listing | null>;
  search(filter: SearchFilters): Promise<{
    items: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  save(listing: Listing): Promise<Listing>;
  update(id: string, updates: Partial<Listing>): Promise<Listing>;
  delete(id: string): Promise<boolean>;
  toggleFavorite(userId: string, listingId: string): Promise<boolean>;
  getFavorites(userId: string): Promise<string[]>;
  createDraft(userId?: string): Promise<any>;
  saveDraft(draft: any, userId?: string): Promise<void>;
  getDraft(userId?: string): Promise<any | null>;
}

export const CANONICAL_DEMO_LISTINGS: Record<string, Listing> = {
  list_1: {
    id: "list_1",
    sellerId: "user_camille",
    categoryId: "bicycles",
    title: "Vélo Gravel Specialized Diverge E5",
    description: "Vélo gravel très bon état, révisé en atelier pro.",
    price: 250,
    currency: "EUR",
    status: "published",
    condition: "tres-bon-etat",
    brand: "Specialized",
    model: "Diverge E5",
    marketCode: "FR",
    city: "Lyon",
    postalCode: "69002",
    department: "69 - Rhône",
    region: "Auvergne-Rhône-Alpes",
    country: "FR",
    allowedDelivery: ["hand_delivery", "relay_point"],
    shippingCost: 8.5,
    images: [
      "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80",
    ],
    isUrgent: false,
    isFeatured: true,
    viewCount: 312,
    favoriteCount: 24,
    attributes: { frame_size: "M", speed_count: 11 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

export class DemoListingRepository implements IListingRepository {
  private listings: Map<string, Listing> = new Map();
  private favorites: Map<string, Set<string>> = new Map(); // userId -> Set of listingIds
  private drafts: Map<string, any> = new Map(); // userId -> draft

  constructor(
    initialListings: Record<string, Listing> = CANONICAL_DEMO_LISTINGS,
  ) {
    this.reset(initialListings);
  }

  reset(initialListings: Record<string, Listing> = CANONICAL_DEMO_LISTINGS) {
    this.listings.clear();
    this.favorites.clear();
    this.drafts.clear();
    Object.values(initialListings).forEach((l) =>
      this.listings.set(l.id, { ...l }),
    );
    this.favorites.set("user_thomas", new Set(["list_1"]));
  }

  async findById(id: string): Promise<Listing | null> {
    const item = this.listings.get(id);
    return item ? { ...item } : null;
  }

  async findPublicById(id: string): Promise<Listing | null> {
    const item = await this.findById(id);
    return item && ["published", "reserved", "sold"].includes(item.status)
      ? item
      : null;
  }

  async search(filters: SearchFilters): Promise<{
    items: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    let result = Array.from(this.listings.values()).filter(
      (listing) => listing.status === "published",
    );

    if (filters.marketCode) {
      result = result.filter(
        (l) => l.marketCode.toUpperCase() === filters.marketCode?.toUpperCase(),
      );
    }
    if (filters.categoryId) {
      result = result.filter((l) => l.categoryId === filters.categoryId);
    }
    if (filters.sellerId) {
      result = result.filter((l) => l.sellerId === filters.sellerId);
    }
    if (filters.publisherOrganizationId) {
      result = result.filter(
        (l) => l.publisherOrganizationId === filters.publisherOrganizationId,
      );
    }
    if (filters.minPrice !== undefined) {
      result = result.filter((l) => l.price >= (filters.minPrice || 0));
    }
    if (filters.maxPrice !== undefined) {
      result = result.filter((l) => l.price <= (filters.maxPrice || Infinity));
    }
    if (filters.city) {
      const cityQ = filters.city.toLowerCase();
      result = result.filter((l) => l.city.toLowerCase().includes(cityQ));
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q),
      );
    }

    if (filters.sortBy === "price_asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === "price_desc") {
      result.sort((a, b) => b.price - a.price);
    } else {
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(500, filters.limit || 20);
    const offset = (page - 1) * limit;
    const paginated = result.slice(offset, offset + limit);

    return {
      items: paginated.map((l) => ({ ...l })),
      total: result.length,
      page,
      totalPages: Math.max(1, Math.ceil(result.length / limit)),
    };
  }

  async save(listing: Listing): Promise<Listing> {
    this.listings.set(listing.id, { ...listing });
    return { ...listing };
  }

  async update(id: string, updates: Partial<Listing>): Promise<Listing> {
    const existing = this.listings.get(id);
    if (!existing) {
      throw new Error(`Listing ${id} not found in Demo repository`);
    }
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.listings.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    return this.listings.delete(id);
  }

  async toggleFavorite(userId: string, listingId: string): Promise<boolean> {
    let userFavs = this.favorites.get(userId);
    if (!userFavs) {
      userFavs = new Set();
      this.favorites.set(userId, userFavs);
    }
    if (userFavs.has(listingId)) {
      userFavs.delete(listingId);
      return false;
    } else {
      userFavs.add(listingId);
      return true;
    }
  }

  async getFavorites(userId: string): Promise<string[]> {
    const userFavs = this.favorites.get(userId);
    return userFavs ? Array.from(userFavs) : ["list_1"];
  }

  async createDraft(userId?: string): Promise<any> {
    const draft = {
      step: "category",
      categoryId: "",
      title: "",
      description: "",
      price: 0,
      condition: "bon-etat",
      photos: [],
      marketCode: "FR",
      allowedDelivery: ["hand_delivery"],
    };
    if (userId) {
      this.drafts.set(userId, draft);
    }
    return draft;
  }

  async saveDraft(draft: any, userId?: string): Promise<void> {
    if (userId) {
      this.drafts.set(userId, draft);
    }
  }

  async getDraft(userId?: string): Promise<any | null> {
    return userId ? this.drafts.get(userId) || null : null;
  }
}

export class PostgresListingRepository implements IListingRepository {
  private static readonly SELLER_PROJECTION =
    "id, slug, name, account_type, account_family, primary_role, status, avatar_url, city, country, bio, is_verified, is_identity_verified, is_phone_verified, is_email_verified, is_business_verified, rating, review_count, response_rate_percent, response_time_text, created_at";

  private mapRowToListing(row: any): Listing {
    const profile = row.profiles;
    return {
      id: row.id,
      sellerId: row.seller_id,
      storeId: row.store_id || undefined,
      publisherType:
        row.publisher_type ||
        (row.publisher_organization_id ? "professional" : "private"),
      publisherUserId: row.publisher_user_id || row.seller_id,
      publisherOrganizationId: row.publisher_organization_id || undefined,
      publisherBranchId: row.publisher_branch_id || undefined,
      publisherVerificationStatus:
        row.publisher_verification_status || undefined,
      publisherStatus: row.publisher_organization?.status || undefined,
      publicationOfferId: row.publication_offer_id || undefined,
      subscriptionId: row.subscription_id || undefined,
      entitlementSnapshot: row.entitlement_snapshot || undefined,
      seller: profile
        ? {
            id: profile.id,
            slug: profile.slug,
            email: profile.email,
            name: profile.name,
            accountType:
              profile.account_family ||
              (profile.account_type === "internal"
                ? "staff"
                : profile.account_type),
            primaryRole: profile.primary_role,
            role: profile.primary_role,
            sellerType:
              profile.account_type === "professional" ? "pro" : "individual",
            status: profile.status,
            avatarUrl: profile.avatar_url || undefined,
            city: profile.city || undefined,
            postalCode: profile.postal_code || undefined,
            country: requireMarketCode(profile.country),
            isVerified: Boolean(profile.is_verified),
            isIdentityVerified: Boolean(profile.is_identity_verified),
            isPhoneVerified: Boolean(profile.is_phone_verified),
            isEmailVerified: Boolean(profile.is_email_verified),
            isBusinessVerified: Boolean(profile.is_business_verified),
            rating: Number(profile.rating || 0),
            reviewCount: Number(profile.review_count || 0),
            responseRatePercent: Number(profile.response_rate_percent || 0),
            responseTimeText: profile.response_time_text || undefined,
            createdAt: profile.created_at,
          }
        : undefined,
      categoryId: row.category_id,
      title: row.title,
      description: row.description,
      price: Number(row.price),
      originalPrice: row.original_price
        ? Number(row.original_price)
        : undefined,
      currency: row.currency,
      status: row.status,
      condition: row.condition || "bon-etat",
      brand: row.brand || undefined,
      model: row.model || undefined,
      marketCode: requireMarketCode(row.market_code),
      city: row.city,
      postalCode: row.postal_code,
      department: row.department || undefined,
      region: row.region || undefined,
      country: requireMarketCode(row.country),
      latitude: row.latitude ? Number(row.latitude) : undefined,
      longitude: row.longitude ? Number(row.longitude) : undefined,
      allowedDelivery: (row.allowed_delivery as DeliveryType[]) || [
        "hand_delivery",
      ],
      shippingCost: row.shipping_cost ? Number(row.shipping_cost) : 0,
      images: Array.isArray(row.listing_media)
        ? [...row.listing_media]
            .sort(
              (left: any, right: any) =>
                Number(left.sort_order || 0) - Number(right.sort_order || 0),
            )
            .map((media: any) => String(media.url))
        : Array.isArray(row.images)
          ? row.images
          : [],
      isUrgent: Boolean(row.is_urgent),
      isFeatured: Boolean(row.is_featured),
      urgentExpiresAt: row.urgent_expires_at || undefined,
      featuredExpiresAt: row.featured_expires_at || undefined,
      bumpedAt: row.bumped_at || undefined,
      promotionState: row.promotion_state || undefined,
      promotionType: row.promotion_type || undefined,
      promotionSource: row.promotion_source || undefined,
      promotionSourceId: row.promotion_source_id || undefined,
      promotionLabel: row.promotion_label || undefined,
      promotionStartAt: row.promotion_start_at || undefined,
      promotionEndAt: row.promotion_end_at || undefined,
      publishedAt: row.published_at || row.created_at,
      materiallyUpdatedAt: row.materially_updated_at || undefined,
      organicFreshnessAt:
        row.organic_freshness_at || row.published_at || row.created_at,
      promotedAt: row.promoted_at || undefined,
      externalStockId: row.external_stock_id || undefined,
      duplicateGroupId: row.duplicate_group_id || undefined,
      viewCount: Number(row.view_count || 0),
      favoriteCount: Number(row.favorite_count || 0),
      safetyRiskScore:
        row.safety_risk_score !== null ? Number(row.safety_risk_score) : 0,
      attributes: row.attributes || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at,
    };
  }

  async findById(id: string): Promise<Listing | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("listings")
        .select(
          `*, listing_media(url, sort_order), profiles:seller_id(${PostgresListingRepository.SELLER_PROJECTION}), publisher_organization:publisher_organization_id(status)`,
        )
        .eq("id", id)
        .single();
      if (error) {
        if (error.code === "PGRST116") return null;
        databaseFailure("listings.findById", error);
      }
      if (!data) return null;
      return this.mapRowToListing(data);
    } catch (error) {
      databaseFailure("listings.findById", error);
    }
  }

  async findPublicById(id: string): Promise<Listing | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await (supabase
        .from("listings")
        .select(
          `*, listing_media(url, sort_order), profiles:seller_id(${PostgresListingRepository.SELLER_PROJECTION}), publisher_organization:publisher_organization_id(status)`,
        )
        .eq("id", id)
        .in("status", ["published", "reserved", "sold"] as any)
        .maybeSingle() as any);
      if (error) databaseFailure("listings.findPublicById", error);
      if (!data) return null;
      const listing = this.mapRowToListing(data);
      if (
        listing.publisherStatus === "suspended" ||
        listing.seller?.status !== "active"
      ) {
        return null;
      }
      return listing;
    } catch (error) {
      databaseFailure("listings.findPublicById", error);
    }
  }

  async search(filters: SearchFilters): Promise<{
    items: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const supabase = getSupabaseAdminClient();
      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(500, filters.limit || 20);
      const offset = (page - 1) * limit;

      let query = supabase
        .from("listings")
        .select(
          `*, listing_media(url, sort_order), profiles:seller_id(${PostgresListingRepository.SELLER_PROJECTION}), publisher_organization:publisher_organization_id(status)`,
          { count: "exact" },
        )
        .eq("status", "published");

      if (filters.marketCode) {
        query = query.eq("market_code", filters.marketCode.toUpperCase());
      }
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.sellerId) {
        query = query.eq("seller_id", filters.sellerId);
      }
      if (filters.publisherOrganizationId) {
        query = query.eq(
          "publisher_organization_id",
          filters.publisherOrganizationId,
        );
      }
      if (filters.minPrice !== undefined) {
        query = query.gte("price", filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte("price", filters.maxPrice);
      }
      if (filters.city) {
        query = query.ilike("city", `%${filters.city}%`);
      }
      if (filters.query) {
        query = query.textSearch("search_vector", filters.query, {
          type: "websearch",
          config: "french",
        });
      }

      if (filters.sortBy === "price_asc") {
        query = query.order("price", { ascending: true });
      } else if (filters.sortBy === "price_desc") {
        query = query.order("price", { ascending: false });
      } else {
        // Promotion never masquerades as organic freshness. Sponsored
        // insertion is handled separately by UnifiedDiscoveryService.
        query = query
          .order("organic_freshness_at", {
            ascending: false,
            nullsFirst: false,
          })
          .order("created_at", { ascending: false });
      }

      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error || !data) databaseFailure("listings.search", error);

      const total = count || 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const items = data.map((r: any) => this.mapRowToListing(r));

      return { items, total, page, totalPages };
    } catch (error) {
      databaseFailure("listings.search", error);
    }
  }

  async save(listing: Listing): Promise<Listing> {
    const supabase = getSupabaseAdminClient();
    const payload = {
      id: listing.id.includes("-") ? listing.id : undefined,
      seller_id: listing.sellerId,
      store_id: listing.storeId || null,
      publisher_type: listing.publisherType || "private",
      publisher_user_id: listing.publisherUserId || listing.sellerId,
      publisher_organization_id: listing.publisherOrganizationId || null,
      publisher_branch_id: listing.publisherBranchId || null,
      publisher_verification_status:
        listing.publisherVerificationStatus || "unverified",
      publication_offer_id: listing.publicationOfferId || null,
      subscription_id: listing.subscriptionId || null,
      entitlement_snapshot: listing.entitlementSnapshot || {},
      category_id: listing.categoryId,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      original_price: listing.originalPrice || null,
      currency: listing.currency,
      status: listing.status,
      condition: listing.condition,
      brand: listing.brand || null,
      model: listing.model || null,
      market_code: listing.marketCode,
      city: listing.city,
      postal_code: listing.postalCode,
      department: listing.department || null,
      region: listing.region || null,
      country: listing.country,
      allowed_delivery: listing.allowedDelivery,
      shipping_cost: listing.shippingCost || 0,
      is_urgent: Boolean(listing.isUrgent),
      is_featured: Boolean(listing.isFeatured),
      promotion_state: listing.promotionState || "inactive",
      promotion_type: listing.promotionType || null,
      promotion_source: listing.promotionSource || null,
      promotion_source_id: listing.promotionSourceId || null,
      promotion_label: listing.promotionLabel || null,
      promotion_start_at: listing.promotionStartAt || null,
      promotion_end_at: listing.promotionEndAt || null,
      published_at: listing.publishedAt || listing.createdAt,
      materially_updated_at: listing.materiallyUpdatedAt || null,
      organic_freshness_at:
        listing.organicFreshnessAt || listing.publishedAt || listing.createdAt,
      promoted_at: listing.promotedAt || null,
      external_stock_id: listing.externalStockId || null,
      duplicate_group_id: listing.duplicateGroupId || null,
      view_count: listing.viewCount,
      favorite_count: listing.favoriteCount,
      safety_risk_score: listing.safetyRiskScore || 0,
      attributes: listing.attributes || {},
      created_at: listing.createdAt,
      updated_at: listing.updatedAt,
      expires_at: listing.expiresAt,
    };

    const { data, error } = await (supabase
      .from("listings")
      .upsert(payload as any)
      .select()
      .single() as any);
    if (error || !data) {
      databaseFailure("listings.save", error);
    }
    return this.mapRowToListing(data);
  }

  async update(id: string, updates: Partial<Listing>): Promise<Listing> {
    const supabase = getSupabaseAdminClient();
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined)
      payload.description = updates.description;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.condition !== undefined) payload.condition = updates.condition;
    if (updates.brand !== undefined) payload.brand = updates.brand;
    if (updates.model !== undefined) payload.model = updates.model;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.postalCode !== undefined)
      payload.postal_code = updates.postalCode;
    if (updates.isUrgent !== undefined) payload.is_urgent = updates.isUrgent;
    if (updates.isFeatured !== undefined)
      payload.is_featured = updates.isFeatured;
    if (updates.viewCount !== undefined) payload.view_count = updates.viewCount;
    if (updates.favoriteCount !== undefined)
      payload.favorite_count = updates.favoriteCount;
    if (updates.attributes !== undefined)
      payload.attributes = updates.attributes;
    if (updates.promotionState !== undefined)
      payload.promotion_state = updates.promotionState;
    if (updates.promotionType !== undefined)
      payload.promotion_type = updates.promotionType;
    if (updates.promotionSource !== undefined)
      payload.promotion_source = updates.promotionSource;
    if (updates.promotionSourceId !== undefined)
      payload.promotion_source_id = updates.promotionSourceId;
    if (updates.promotionLabel !== undefined)
      payload.promotion_label = updates.promotionLabel;
    if (updates.promotionStartAt !== undefined)
      payload.promotion_start_at = updates.promotionStartAt;
    if (updates.promotionEndAt !== undefined)
      payload.promotion_end_at = updates.promotionEndAt;
    if (updates.materiallyUpdatedAt !== undefined)
      payload.materially_updated_at = updates.materiallyUpdatedAt;
    if (updates.organicFreshnessAt !== undefined)
      payload.organic_freshness_at = updates.organicFreshnessAt;

    const { data, error } = await ((supabase.from("listings") as any)
      .update(payload)
      .eq("id", id)
      .select()
      .single() as any);
    if (error || !data) {
      databaseFailure("listings.update", error);
    }
    return this.mapRowToListing(data);
  }

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) databaseFailure("listings.delete", error);
    return !error;
  }

  async toggleFavorite(userId: string, listingId: string): Promise<boolean> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc("toggle_favorite", {
      p_user_id: userId,
      p_listing_id: listingId,
    });
    if (error) databaseFailure("listings.toggleFavorite", error);
    return Boolean(data);
  }

  async getFavorites(userId: string): Promise<string[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", userId);
      if (error || !data) databaseFailure("listings.getFavorites", error);
      return data.map((f: any) => f.listing_id);
    } catch (error) {
      databaseFailure("listings.getFavorites", error);
    }
  }

  async createDraft(userId?: string): Promise<any> {
    if (!userId)
      throw new AppError({
        code: "UNAUTHENTICATED",
        message: "Connexion requise.",
      });
    const draft = {
      step: "category",
      categoryId: "",
      title: "",
      description: "",
      price: 0,
      condition: "bon-etat",
      photos: [],
      marketCode: "FR",
      allowedDelivery: ["hand_delivery"],
    };
    await this.saveDraft(draft, userId);
    return draft;
  }

  async saveDraft(draft: any, userId?: string): Promise<void> {
    if (!userId)
      throw new AppError({
        code: "UNAUTHENTICATED",
        message: "Connexion requise.",
      });
    const supabase = getSupabaseAdminClient();
    const { error } = await (
      supabase.from("listing_drafts" as any) as any
    ).upsert({
      user_id: userId,
      draft_data: draft,
      updated_at: new Date().toISOString(),
    });
    if (error) databaseFailure("listings.saveDraft", error);
  }

  async getDraft(userId?: string): Promise<any | null> {
    if (!userId)
      throw new AppError({
        code: "UNAUTHENTICATED",
        message: "Connexion requise.",
      });
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (
      supabase.from("listing_drafts" as any) as any
    )
      .select("draft_data")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) databaseFailure("listings.getDraft", error);
    return data?.draft_data ?? null;
  }
}
