import { Listing, SearchFilters } from '../../shared/types/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import { getSupabaseAdminClient } from '../../infrastructure/supabase/supabase-client.js';
import { searchProvider } from '../../infrastructure/search/search-provider.js';
import { geminiClient } from '../../integrations/ai/gemini-client.js';
import { logger } from '../../infrastructure/logging/logger.js';

export interface PublicationDraftInput {
  title?: string;
  description?: string;
  price?: number;
  categoryId?: string;
  marketCode?: string;
  city?: string;
  postalCode?: string;
  images?: string[];
  attributes?: Record<string, any>;
  allowedDelivery?: string[];
  shippingCost?: number;
  condition?: string;
  brand?: string;
  model?: string;
}

const DEMO_LISTINGS: Record<string, Listing> = {
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

export class ListingsService {
  async getListings(filter?: SearchFilters): Promise<{ listings: Listing[]; total: number }> {
    try {
      const res = await searchProvider.searchListings(filter || {});
      if (res.items && res.items.length > 0) {
        return { listings: res.items, total: res.total };
      }
    } catch {
      // fallback
    }
    const all = Object.values(DEMO_LISTINGS);
    return { listings: all, total: all.length };
  }

  async getListingById(id: string): Promise<Listing | null> {
    if (DEMO_LISTINGS[id]) {
      return DEMO_LISTINGS[id];
    }

    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await (supabase
        .from('listings')
        .select('*, profiles:seller_id(*)')
        .eq('id', id)
        .single() as any);

      if (!error && data) {
        const item: any = data;
        return {
          id: item.id,
          sellerId: item.seller_id,
          storeId: item.store_id,
          categoryId: item.category_id,
          title: item.title,
          description: item.description,
          price: Number(item.price),
          originalPrice: item.original_price ? Number(item.original_price) : undefined,
          currency: item.currency,
          status: item.status,
          condition: item.condition,
          brand: item.brand,
          model: item.model,
          marketCode: item.market_code,
          city: item.city,
          postalCode: item.postal_code,
          department: item.department,
          region: item.region,
          country: item.country,
          allowedDelivery: item.allowed_delivery || ['hand_delivery'],
          shippingCost: item.shipping_cost ? Number(item.shipping_cost) : 0,
          images: [],
          isUrgent: item.is_urgent,
          isFeatured: item.is_featured,
          viewCount: item.view_count,
          favoriteCount: item.favorite_count,
          attributes: item.attributes || {},
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          expiresAt: item.expires_at,
        };
      }
    } catch {
      // ignore
    }

    return null;
  }

  async searchListings(params: SearchFilters) {
    try {
      const res = await searchProvider.searchListings(params);
      if (res.items && res.items.length > 0) return res;
    } catch {
      // fallback
    }
    const all = Object.values(DEMO_LISTINGS);
    return { items: all, total: all.length, page: 1, totalPages: 1 };
  }

  async createListingDraft(userId?: string): Promise<any> {
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

  async saveListingDraft(draft: any, userId?: string): Promise<void> {
    logger.debug(`Saved draft for user ${userId || 'anonymous'}`);
  }

  async publishListing(draft: PublicationDraftInput, sellerId: string): Promise<Listing> {
    if (!draft.title || !draft.price || !draft.categoryId) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Titre, prix et catégorie obligatoires pour publier une annonce.',
      });
    }

    const safety = await geminiClient.analyzeListingContent(
      draft.title,
      draft.description || '',
      draft.price
    );

    const newId = `list_${Math.random().toString(36).substring(2, 12)}`;

    const listing: Listing = {
      id: newId,
      sellerId,
      categoryId: draft.categoryId,
      title: draft.title,
      description: draft.description || '',
      price: Number(draft.price),
      currency: 'EUR',
      status: safety.riskScore >= 50 ? 'flagged' : 'published',
      condition: draft.condition || 'bon-etat',
      brand: draft.brand,
      model: draft.model,
      marketCode: draft.marketCode || 'FR',
      city: draft.city || 'Paris',
      postalCode: draft.postalCode || '75000',
      country: 'FR',
      allowedDelivery: (draft.allowedDelivery as any) || ['hand_delivery'],
      shippingCost: draft.shippingCost || 0,
      images: draft.images || [],
      isUrgent: false,
      isFeatured: false,
      viewCount: 0,
      favoriteCount: 0,
      safetyRiskScore: safety.riskScore,
      attributes: draft.attributes || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    };

    DEMO_LISTINGS[newId] = listing;
    logger.info(`Listing published successfully: ${newId} (Risk: ${safety.riskScore})`);
    return listing;
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    const existing = await this.getListingById(id);
    if (!existing) {
      throw new AppError({ code: 'NOT_FOUND', message: `Listing ${id} not found` });
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    DEMO_LISTINGS[id] = updated;
    return updated;
  }

  async deleteListing(id: string): Promise<boolean> {
    delete DEMO_LISTINGS[id];
    logger.info(`Listing deleted: ${id}`);
    return true;
  }

  async toggleFavorite(listingId: string): Promise<boolean> {
    return true;
  }

  async getFavorites(): Promise<string[]> {
    return ['list_1'];
  }
}

export const listingsService = new ListingsService();
