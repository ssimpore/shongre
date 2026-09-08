import { Listing, Transaction } from "../../types";
import type { Money } from "@shongre/contracts";

export interface UserWorkspaceSummary {
  totalListingsCount: number;
  activeListingsCount: number;
  savedSearchesCount: number;
  totalViewsCount: number;
  totalFavoritesCount: number;
  unreadMessagesCount: number;
  pendingTransactionsCount: number;
  totalEarningsAmount: number;
  recentListings: Listing[];
  recentPurchases: Transaction[];
}

export interface ProAnalyticsSnapshot {
  revenueByCurrency: Money[];
  catalogueSampleViews: number;
  topListings: Listing[];
}

export interface WorkspaceServiceContract {
  getUserWorkspaceSummary(
    userId: string,
    marketCode: string,
  ): Promise<UserWorkspaceSummary>;
  getProAnalytics(sellerId: string): Promise<ProAnalyticsSnapshot>;
}
