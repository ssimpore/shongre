import { Listing, SearchFilters, DeliveryType } from '../../../shared/types/index.js';
import { getSupabaseAdminClient } from '../../supabase/supabase-client.js';
import { logger } from '../../logging/logger.js';

export interface IListingRepository {
  findById(id: string): Promise<Listing | null>;
  search(filter: SearchFilters): Promise<{ items: Listing[]; total: number; page: number; totalPages: number }>;
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
    id: 'list_1',
    sellerId: 'user_camille',
    categoryId: 'bicycles',
    title: 'Vélo Gravel Specialized Diverge E5',
    description: 'Vélo gravel très bon état, révisé en atelier pro.',
    price: 250,
    currency: 'EUR',
    status: 'published',
    condition: 'tres-bon-etat',
    brand: 'Specialized',
    model: 'Diverge E5',
    marketCode: 'FR',
    city: 'Lyon',
    postalCode: '69002',
    department: '69 - Rhône',
    region: 'Auvergne-Rhône-Alpes',
    country: 'FR',
    allowedDelivery: ['hand_delivery', 'relay_point'],
    shippingCost: 8.5,
    images: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80'],
    isUrgent: false,
    isFeatured: true,
    viewCount: 312,
    favoriteCount: 24,
    attributes: { frame_size: 'M', speed_count: 11 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

export class DemoListingRepository implements IListingRepository {
  private listings: Map<string, Listing> = new Map();
  private favorites: Map<string, Set<string>> = new Map(); // userId -> Set of listingIds
  private drafts: Map<string, any> = new Map(); // userId -> draft

  constructor(initialListings: Record<string, Listing> = CANONICAL_DEMO_LISTINGS) {
    this.reset(initialListings);
  }

  reset(initialListings: Record<string, Listing> = CANONICAL_DEMO_LISTINGS) {
    this.listings.clear();
    this.favorites.clear();
    this.drafts.clear();
    Object.values(initialListings).forEach((l) => this.listings.set(l.id, { ...l }));
    this.favorites.set('user_thomas', new Set(['list_1']));
  }

  async findById(id: string): Promise<Listing | null> {
    const item = this.listings.get(id);
    return item ? { ...item } : null;
  }

  async search(filters: SearchFilters): Promise<{ items: Listing[]; total: number; page: number; totalPages: number }> {
    let result = Array.from(this.listings.values());

    if (filters.marketCode) {
      result = result.filter((l) => l.marketCode.toUpperCase() === filters.marketCode?.toUpperCase());
    }
    if (filters.categoryId) {
      result = result.filter((l) => l.categoryId === filters.categoryId);
    }
    if (filters.sellerId) {
      result = result.filter((l) => l.sellerId === filters.sellerId);
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
        (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
      );
    }

    if (filters.sortBy === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, filters.limit || 20);
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
    return userFavs ? Array.from(userFavs) : ['list_1'];
  }

  async createDraft(userId?: string): Promise<any> {
    const draft = {
      step: 'category',
      categoryId: '',
      title: '',
      description: '',
      price: 0,
      condition: 'bon-etat',
      photos: [],
      marketCode: 'FR',
      allowedDelivery: ['hand_delivery'],
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
  private mapRowToListing(row: any): Listing {
    return {
      id: row.id,
      sellerId: row.seller_id,
      storeId: row.store_id || undefined,
      categoryId: row.category_id,
      title: row.title,
      description: row.description,
      price: Number(row.price),
      originalPrice: row.original_price ? Number(row.original_price) : undefined,
      currency: row.currency || 'EUR',
      status: row.status,
      condition: row.condition || 'bon-etat',
      brand: row.brand || undefined,
      model: row.model || undefined,
      marketCode: row.market_code || 'FR',
      city: row.city,
      postalCode: row.postal_code,
      department: row.department || undefined,
      region: row.region || undefined,
      country: row.country || 'FR',
      latitude: row.latitude ? Number(row.latitude) : undefined,
      longitude: row.longitude ? Number(row.longitude) : undefined,
      allowedDelivery: (row.allowed_delivery as DeliveryType[]) || ['hand_delivery'],
      shippingCost: row.shipping_cost ? Number(row.shipping_cost) : 0,
      images: Array.isArray(row.images) ? row.images : [],
      isUrgent: Boolean(row.is_urgent),
      isFeatured: Boolean(row.is_featured),
      urgentExpiresAt: row.urgent_expires_at || undefined,
      featuredExpiresAt: row.featured_expires_at || undefined,
      bumpedAt: row.bumped_at || undefined,
      viewCount: Number(row.view_count || 0),
      favoriteCount: Number(row.favorite_count || 0),
      safetyRiskScore: row.safety_risk_score !== null ? Number(row.safety_risk_score) : 0,
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
        .from('listings')
        .select('*, profiles:seller_id(*)')
        .eq('id', id)
        .single();
      if (error || !data) return null;
      return this.mapRowToListing(data);
    } catch (err: any) {
      logger.error(`PostgresListingRepository.findById error: ${err.message}`);
      return null;
    }
  }

  async search(filters: SearchFilters): Promise<{ items: Listing[]; total: number; page: number; totalPages: number }> {
    try {
      const supabase = getSupabaseAdminClient();
      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(50, filters.limit || 20);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('listings')
        .select('*, profiles:seller_id(*)', { count: 'exact' })
        .eq('status', 'published');

      if (filters.marketCode) {
        query = query.eq('market_code', filters.marketCode.toUpperCase());
      }
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters.sellerId) {
        query = query.eq('seller_id', filters.sellerId);
      }
      if (filters.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      if (filters.query) {
        query = query.textSearch('search_vector', filters.query, {
          type: 'websearch',
          config: 'french',
        });
      }

      if (filters.sortBy === 'price_asc') {
        query = query.order('price', { ascending: true });
      } else if (filters.sortBy === 'price_desc') {
        query = query.order('price', { ascending: false });
      } else {
        query = query
          .order('is_urgent', { ascending: false })
          .order('bumped_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
      }

      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error || !data) {
        return { items: [], total: 0, page, totalPages: 0 };
      }

      const total = count || 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const items = data.map((r: any) => this.mapRowToListing(r));

      return { items, total, page, totalPages };
    } catch (err: any) {
      logger.error(`PostgresListingRepository.search error: ${err.message}`);
      return { items: [], total: 0, page: 1, totalPages: 1 };
    }
  }

  async save(listing: Listing): Promise<Listing> {
    const supabase = getSupabaseAdminClient();
    const payload = {
      id: listing.id.includes('-') ? listing.id : undefined,
      seller_id: listing.sellerId,
      store_id: listing.storeId || null,
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
      view_count: listing.viewCount,
      favorite_count: listing.favoriteCount,
      safety_risk_score: listing.safetyRiskScore || 0,
      attributes: listing.attributes || {},
      created_at: listing.createdAt,
      updated_at: listing.updatedAt,
      expires_at: listing.expiresAt,
    };

    const { data, error } = await (supabase.from('listings').upsert(payload as any).select().single() as any);
    if (error || !data) {
      throw new Error(`Failed to save listing to PostgreSQL: ${error?.message}`);
    }
    return this.mapRowToListing(data);
  }

  async update(id: string, updates: Partial<Listing>): Promise<Listing> {
    const supabase = getSupabaseAdminClient();
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.condition !== undefined) payload.condition = updates.condition;
    if (updates.brand !== undefined) payload.brand = updates.brand;
    if (updates.model !== undefined) payload.model = updates.model;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.postalCode !== undefined) payload.postal_code = updates.postalCode;
    if (updates.isUrgent !== undefined) payload.is_urgent = updates.isUrgent;
    if (updates.isFeatured !== undefined) payload.is_featured = updates.isFeatured;
    if (updates.viewCount !== undefined) payload.view_count = updates.viewCount;
    if (updates.favoriteCount !== undefined) payload.favorite_count = updates.favoriteCount;
    if (updates.attributes !== undefined) payload.attributes = updates.attributes;

    const { data, error } = await ((supabase.from('listings') as any).update(payload).eq('id', id).select().single() as any);
    if (error || !data) {
      throw new Error(`Failed to update listing in PostgreSQL: ${error?.message}`);
    }
    return this.mapRowToListing(data);
  }

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from('listings').delete().eq('id', id);
    return !error;
  }

  async toggleFavorite(userId: string, listingId: string): Promise<boolean> {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .single();

    if (data) {
      await supabase.from('favorites').delete().eq('user_id', userId).eq('listing_id', listingId);
      return false;
    } else {
      await supabase.from('favorites').insert({ user_id: userId, listing_id: listingId } as any);
      return true;
    }
  }

  async getFavorites(userId: string): Promise<string[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase.from('favorites').select('listing_id').eq('user_id', userId);
      if (error || !data) return [];
      return data.map((f: any) => f.listing_id);
    } catch {
      return [];
    }
  }

  async createDraft(userId?: string): Promise<any> {
    return {
      step: 'category',
      categoryId: '',
      title: '',
      description: '',
      price: 0,
      condition: 'bon-etat',
      photos: [],
      marketCode: 'FR',
      allowedDelivery: ['hand_delivery'],
    };
  }

  async saveDraft(draft: any, userId?: string): Promise<void> {
    logger.debug(`Draft saved for user ${userId}`);
  }

  async getDraft(userId?: string): Promise<any | null> {
    return null;
  }
}
