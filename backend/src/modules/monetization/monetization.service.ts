import {
  IMonetizationRepository,
  repositories,
  ListingBoostOption,
  ProPlan,
  CANONICAL_DEMO_BOOSTS,
  CANONICAL_DEMO_PRO_PLANS,
} from '../../infrastructure/database/repositories/index.js';

export type { ListingBoostOption, ProPlan };
export const CANONICAL_BOOSTS: ListingBoostOption[] = CANONICAL_DEMO_BOOSTS;
export const CANONICAL_PRO_PLANS: ProPlan[] = CANONICAL_DEMO_PRO_PLANS;

export class MonetizationService {
  constructor(private monetizationRepo: IMonetizationRepository = repositories.monetization) {}

  async getAvailableBoosts(listingId?: string): Promise<ListingBoostOption[]> {
    return this.monetizationRepo.getBoosts(listingId);
  }

  async getProSubscriptionPlans(): Promise<ProPlan[]> {
    return this.monetizationRepo.getPlans();
  }

  async applyBoost(listingId: string, boostId: string, paymentMethod: string): Promise<{ success: boolean; expiresAt: string }> {
    return this.monetizationRepo.applyBoost(listingId, boostId, paymentMethod);
  }

  async subscribeToProPlan(sellerId: string, planId: string): Promise<{ success: boolean; plan: ProPlan }> {
    return this.monetizationRepo.subscribe(sellerId, planId);
  }
}

export const monetizationService = new MonetizationService();
