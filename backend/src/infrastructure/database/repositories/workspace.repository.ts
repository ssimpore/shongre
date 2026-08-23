import { Listing, Transaction } from "../../../shared/types/index.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";
import { PostgresListingRepository } from "./listing.repository.js";
import { PostgresOrderRepository } from "./order.repository.js";

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
  private readonly listingRepository = new PostgresListingRepository();
  private readonly orderRepository = new PostgresOrderRepository();

  async getUserWorkspaceSummary(userId: string): Promise<UserWorkspaceSummary> {
    try {
      const supabase = getSupabaseAdminClient();
      const [
        listingsRes,
        ordersRes,
        unreadRes,
        recentListingResult,
        purchases,
        sales,
      ] = await Promise.all([
        supabase
          .from("listings")
          .select("view_count, favorite_count", { count: "exact" })
          .eq("seller_id", userId)
          .eq("status", "published"),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", userId)
          .in("status", [
            "initiated",
            "escrow_funded",
            "shipped",
            "pin_pending",
          ]),
        (supabase as any).rpc("get_unread_message_count", {
          p_user_id: userId,
        }),
        this.listingRepository.search({ sellerId: userId, page: 1, limit: 5 }),
        this.orderRepository.getPurchases(userId),
        this.orderRepository.getSales(userId),
      ]);

      if (listingsRes.error)
        databaseFailure("workspace.getListingsSummary", listingsRes.error);
      if (ordersRes.error)
        databaseFailure("workspace.getPendingOrders", ordersRes.error);
      if (unreadRes.error)
        databaseFailure("workspace.getUnreadMessages", unreadRes.error);

      const listingRows = listingsRes.data || [];
      const completedSales = sales.filter(
        (order) => order.status === "completed",
      );

      return {
        activeListingsCount: listingsRes.count ?? 0,
        totalViewsCount: listingRows.reduce(
          (sum, listing) => sum + Number(listing.view_count || 0),
          0,
        ),
        totalFavoritesCount: listingRows.reduce(
          (sum, listing) => sum + Number(listing.favorite_count || 0),
          0,
        ),
        unreadMessagesCount: Number(unreadRes.data || 0),
        pendingTransactionsCount: ordersRes.count ?? 0,
        totalEarningsAmount: completedSales.reduce(
          (sum, order) => sum + order.itemAmount,
          0,
        ),
        recentListings: recentListingResult.items,
        recentPurchases: purchases.slice(0, 5),
      };
    } catch (error) {
      databaseFailure("workspace.getUserWorkspaceSummary", error);
    }
  }

  async getProAnalytics(sellerId: string): Promise<{
    monthlyRevenue: number;
    monthlyViews: number;
    conversionRate: number;
    topListings: Listing[];
  }> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setUTCDate(1);
      startOfMonth.setUTCHours(0, 0, 0, 0);
      const [listings, sales] = await Promise.all([
        this.listingRepository.search({ sellerId, page: 1, limit: 100 }),
        this.orderRepository.getSales(sellerId),
      ]);
      const monthlySales = sales.filter(
        (order) =>
          order.status === "completed" &&
          new Date(order.updatedAt) >= startOfMonth,
      );
      const monthlyViews = listings.items.reduce(
        (sum, listing) => sum + Number(listing.viewCount || 0),
        0,
      );

      return {
        monthlyRevenue: monthlySales.reduce(
          (sum, order) => sum + order.itemAmount,
          0,
        ),
        monthlyViews,
        conversionRate:
          monthlyViews > 0 ? (monthlySales.length / monthlyViews) * 100 : 0,
        topListings: [...listings.items]
          .sort(
            (left, right) =>
              Number(right.viewCount || 0) - Number(left.viewCount || 0),
          )
          .slice(0, 5),
      };
    } catch (error) {
      databaseFailure("workspace.getProAnalytics", error);
    }
  }
}
