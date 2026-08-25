import { Listing, Transaction } from "../../types";
import type { Money } from "@shongre/contracts";

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

export interface ProAnalyticsDay {
  date: string;
  views: number;
  leads: number;
}

export interface ProListingPerformance {
  listing: Listing;
  conversionRate: number;
}

export interface ProAnalyticsSnapshot {
  monthlyRevenue: Money;
  monthlyViews: number;
  contactsCount: number;
  conversionRate: number;
  weeklyViewsChangePercent: number;
  weeklyContactsChangePercent: number;
  weeklyStats: ProAnalyticsDay[];
  topListings: ProListingPerformance[];
}

export interface WorkspaceServiceContract {
  getUserWorkspaceSummary(userId: string): Promise<UserWorkspaceSummary>;
  getProAnalytics(sellerId: string): Promise<ProAnalyticsSnapshot>;
}
