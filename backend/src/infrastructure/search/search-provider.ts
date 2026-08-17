import { SearchFilters, Listing } from '../../shared/types/index.js';
import { getSupabaseAdminClient } from '../supabase/supabase-client.js';

export class SearchProvider {
  async searchListings(filters: SearchFilters): Promise<{
    items: Listing[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const supabase = getSupabaseAdminClient();
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, filters.limit || 20);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('listings')
      .select('*, profiles:seller_id(*)', { count: 'exact' })
      .eq('status', 'published');

    if (filters.marketCode) {
      query = query.eq('market_code', filters.marketCode);
    }
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
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
    const totalPages = Math.ceil(total / limit);

    const items: Listing[] = data.map((row: any) => ({
      id: row.id,
      sellerId: row.seller_id,
      storeId: row.store_id,
      categoryId: row.category_id,
      title: row.title,
      description: row.description,
      price: Number(row.price),
      originalPrice: row.original_price ? Number(row.original_price) : undefined,
      currency: row.currency,
      status: row.status,
      condition: row.condition,
      brand: row.brand,
      model: row.model,
      marketCode: row.market_code,
      city: row.city,
      postalCode: row.postal_code,
      department: row.department,
      region: row.region,
      country: row.country,
      allowedDelivery: row.allowed_delivery || ['hand_delivery'],
      shippingCost: row.shipping_cost ? Number(row.shipping_cost) : 0,
      images: [],
      isUrgent: row.is_urgent,
      isFeatured: row.is_featured,
      viewCount: row.view_count,
      favoriteCount: row.favorite_count,
      attributes: row.attributes || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at,
    }));

    return { items, total, page, totalPages };
  }
}

export const searchProvider = new SearchProvider();
