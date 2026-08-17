import { Listing, Transaction } from '../../shared/types/index.js';

export interface UserWorkspaceSummary {
  activeListingsCount: number;
  totalViewsCount: number;
  totalFavoritesCount: number;
  unreadMessagesCount: number;
  pendingTransactionsCount: number;
  totalEarningsAmount: number;
  recentListings: Listing[];
  recentPurchases: Transaction[];
}

export class WorkspaceService {
  async getUserWorkspaceSummary(userId: string): Promise<UserWorkspaceSummary> {
    return {
      activeListingsCount: 3,
      totalViewsCount: 412,
      totalFavoritesCount: 28,
      unreadMessagesCount: 2,
      pendingTransactionsCount: 1,
      totalEarningsAmount: 1450.0,
      recentListings: [],
      recentPurchases: [],
    };
  }

  async getProAnalytics(sellerId: string): Promise<{
    monthlyRevenue: number;
    monthlyViews: number;
    conversionRate: number;
    topListings: Listing[];
  }> {
    return {
      monthlyRevenue: 3840.0,
      monthlyViews: 12450,
      conversionRate: 3.2,
      topListings: [],
    };
  }
}

export const workspaceService = new WorkspaceService();
