import { Listing, SearchFilters } from '../../shared/types/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import { IListingRepository, repositories } from '../../infrastructure/database/repositories/index.js';
import { IAIProvider, providers } from '../../integrations/providers/index.js';
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

export class ListingsService {
  constructor(
    private listingRepo: IListingRepository = repositories.listings,
    private ai: IAIProvider = providers.ai
  ) {}

  async getListings(filter?: SearchFilters): Promise<{ listings: Listing[]; total: number }> {
    const res = await this.listingRepo.search(filter || {});
    return { listings: res.items, total: res.total };
  }

  async getListingById(id: string): Promise<Listing | null> {
    return this.listingRepo.findById(id);
  }

  async searchListings(params: SearchFilters) {
    return this.listingRepo.search(params);
  }

  async createListingDraft(userId?: string): Promise<any> {
    return this.listingRepo.createDraft(userId);
  }

  async saveListingDraft(draft: any, userId?: string): Promise<void> {
    await this.listingRepo.saveDraft(draft, userId);
  }

  async publishListing(draft: PublicationDraftInput, sellerId: string): Promise<Listing> {
    if (!draft.title || !draft.price || !draft.categoryId) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Titre, prix et catégorie obligatoires pour publier une annonce.',
      });
    }

    const safety = await this.ai.analyzeListingContent(
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

    const saved = await this.listingRepo.save(listing);
    logger.info(`Listing published successfully: ${saved.id} (Risk: ${safety.riskScore})`);
    return saved;
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    const existing = await this.listingRepo.findById(id);
    if (!existing) {
      throw new AppError({ code: 'NOT_FOUND', message: `Listing ${id} not found` });
    }
    return this.listingRepo.update(id, updates);
  }

  async deleteListing(id: string): Promise<boolean> {
    const success = await this.listingRepo.delete(id);
    logger.info(`Listing deleted: ${id}`);
    return success;
  }

  async toggleFavorite(listingId: string, userId = 'user_thomas'): Promise<boolean> {
    return this.listingRepo.toggleFavorite(userId, listingId);
  }

  async getFavorites(userId = 'user_thomas'): Promise<string[]> {
    return this.listingRepo.getFavorites(userId);
  }
}

export const listingsService = new ListingsService();
