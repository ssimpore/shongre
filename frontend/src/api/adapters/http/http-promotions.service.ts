import { PromotionsServiceContract } from '../../contracts/promotions.contract';
import { httpClient } from './http-client';
import { ListingBoostOption, ProPlan } from '../../../configuration/plans.config';

export class HttpPromotionsService implements PromotionsServiceContract {
  async getAvailableBoosts(listingId?: string): Promise<ListingBoostOption[]> {
    return httpClient.get<ListingBoostOption[]>('/promotions/boosts', { params: { listingId } });
  }

  async getProSubscriptionPlans(): Promise<ProPlan[]> {
    return httpClient.get<ProPlan[]>('/promotions/pro-plans');
  }

  async applyBoost(listingId: string, boostId: string, paymentMethod: string): Promise<{ success: boolean; expiresAt: string }> {
    return httpClient.post<{ success: boolean; expiresAt: string }>('/promotions/apply-boost', { listingId, boostId, paymentMethod });
  }

  async subscribeToProPlan(sellerId: string, planId: string): Promise<{ success: boolean; plan: ProPlan }> {
    return httpClient.post<{ success: boolean; plan: ProPlan }>('/promotions/subscribe-pro', { sellerId, planId });
  }
}

export const httpPromotionsService = new HttpPromotionsService();
