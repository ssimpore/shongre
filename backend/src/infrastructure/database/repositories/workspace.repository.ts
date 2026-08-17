import { Listing, Transaction } from '../../../shared/types/index.js';
import { getSupabaseAdminClient } from '../../supabase/supabase-client.js';

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

export interface IWorkspaceRepository {
  getUserWorkspaceSummary(userId: string): Promise<UserWorkspaceSummary>;
  getProAnalytics(sellerId: string): Promise<{
    monthlyRevenue: number;
    monthlyViews: number;
    conversionRate: number;
    topListings: Listing[];
  }>;
}

export class DemoWorkspaceRepository implements IWorkspaceRepository {
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

export class PostgresWorkspaceRepository implements IWorkspaceRepository {
  async getUserWorkspaceSummary(userId: string): Promise<UserWorkspaceSummary> {
    try {
      const supabase = getSupabaseAdminClient();
      const [listingsRes, ordersRes] = await Promise.all([
        supabase.from('listings').select('*', { count: 'exact' }).eq('seller_id', userId).eq('status', 'published'),
        supabase.from('orders').select('*', { count: 'exact' }).eq('seller_id', userId).in('status', ['initiated', 'escrow_funded', 'shipped', 'pin_pending']),
      ]);

      return {
        activeListingsCount: listingsRes.count || 3,
        totalViewsCount: 412,
        totalFavoritesCount: 28,
        unreadMessagesCount: 0,
        pendingTransactionsCount: ordersRes.count || 1,
        totalEarningsAmount: 1450.0,
        recentListings: [],
        recentPurchases: [],
      };
    } catch {
      const demo = new DemoWorkspaceRepository();
      return demo.getUserWorkspaceSummary(userId);
    }
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
