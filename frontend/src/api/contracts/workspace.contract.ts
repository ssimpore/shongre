import { Listing, Transaction } from "../../types";

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

export interface WorkspaceServiceContract {
  getUserWorkspaceSummary(userId: string): Promise<UserWorkspaceSummary>;
  getProAnalytics(sellerId: string): Promise<{
    monthlyRevenue: number;
    monthlyViews: number;
    conversionRate: number;
    topListings: Listing[];
  }>;
}
