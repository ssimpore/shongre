import { Listing, Transaction } from "../../../shared/types/index.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";
import { PostgresListingRepository } from "./listing.repository.js";
import { PostgresOrderRepository } from "./order.repository.js";
import type { components } from "@shongre/contracts/openapi";
import type { Money } from "@shongre/contracts";
import { majorToMinorAmount } from "@shongre/shared/money";

export type ProAnalytics = Omit<
  components["schemas"]["WorkspaceProAnalytics"],
  "topListings"
> & { topListings: Listing[] };

export function revenueByCurrency(
  orders: ReadonlyArray<{
    currency: string;
    itemAmount: number;
    itemAmountMinor?: number;
  }>,
): Money[] {
  const totals = new Map<string, number>();
  for (const order of orders) {
    // Legacy major-unit orders are normalized only at this repository boundary.
    const currency = order.currency.toUpperCase();
    const amountMinor =
      order.itemAmountMinor ?? majorToMinorAmount(order.itemAmount, currency);
    const total = (totals.get(currency) ?? 0) + amountMinor;
    if (
      !/^[A-Z]{3}$/.test(currency) ||
      !Number.isSafeInteger(amountMinor) ||
      amountMinor < 0 ||
      !Number.isSafeInteger(total)
    ) {
      throw new Error("Invalid workspace revenue projection");
    }
    totals.set(currency, total);
  }
  return [...totals]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amountMinor]) => ({ currency, amountMinor }));
}

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

export interface IWorkspaceRepository {
  getUserWorkspaceSummary(
    userId: string,
    marketCode: string,
  ): Promise<UserWorkspaceSummary>;
  getProAnalytics(sellerId: string): Promise<ProAnalytics>;
}

export class DemoWorkspaceRepository implements IWorkspaceRepository {
  async getUserWorkspaceSummary(
    _userId: string,
    _marketCode: string,
  ): Promise<UserWorkspaceSummary> {
    return {
      totalListingsCount: 3,
      activeListingsCount: 3,
      savedSearchesCount: 2,
      totalViewsCount: 412,
      totalFavoritesCount: 28,
      unreadMessagesCount: 2,
      pendingTransactionsCount: 1,
      totalEarningsAmount: 1450.0,
      recentListings: [],
      recentPurchases: [],
    };
  }

  async getProAnalytics(_sellerId: string): Promise<ProAnalytics> {
    return {
      monthlyRevenue: 3840.0,
      revenueByCurrency: [{ amountMinor: 384000, currency: "EUR" }],
      monthlyViews: 12450,
      conversionRate: 3.2,
      topListings: [],
    };
  }
}

export class PostgresWorkspaceRepository implements IWorkspaceRepository {
  private readonly listingRepository = new PostgresListingRepository();
  private readonly orderRepository = new PostgresOrderRepository();

  async getUserWorkspaceSummary(
    userId: string,
    marketCode: string,
  ): Promise<UserWorkspaceSummary> {
    try {
      const supabase = getSupabaseAdminClient();
      const [
        allListingsRes,
        listingsRes,
        savedSearchesRes,
        ordersRes,
        unreadRes,
        recentListingResult,
        purchases,
        sales,
      ] = await Promise.all([
        supabase
          .from("listings")
          .select("id, listing_market_publications!inner(market_code)", {
            count: "exact",
            head: true,
          })
          .eq("seller_id", userId)
          .eq("listing_market_publications.market_code", marketCode),
        supabase
          .from("listings")
          .select(
            "view_count, favorite_count, listing_market_publications!inner(market_code)",
            { count: "exact" },
          )
          .eq("seller_id", userId)
          .eq("status", "published")
          .eq("listing_market_publications.market_code", marketCode)
          .eq("listing_market_publications.status", "active")
          .eq("listing_market_publications.compliance_state", "approved"),
        supabase
          .from("saved_searches")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("market_code", marketCode),
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
        this.listingRepository.search({
          sellerId: userId,
          marketCode,
          page: 1,
          limit: 5,
        }),
        this.orderRepository.getPurchases(userId),
        this.orderRepository.getSales(userId),
      ]);

      if (allListingsRes.error)
        databaseFailure("workspace.getAllListingsCount", allListingsRes.error);
      if (listingsRes.error)
        databaseFailure("workspace.getListingsSummary", listingsRes.error);
      if (savedSearchesRes.error)
        databaseFailure(
          "workspace.getSavedSearchesCount",
          savedSearchesRes.error,
        );
      if (ordersRes.error)
        databaseFailure("workspace.getPendingOrders", ordersRes.error);
      if (unreadRes.error)
        databaseFailure("workspace.getUnreadMessages", unreadRes.error);

      const listingRows = listingsRes.data || [];
      const completedSales = sales.filter(
        (order) => order.status === "completed",
      );

      return {
        totalListingsCount: allListingsRes.count ?? 0,
        activeListingsCount: listingsRes.count ?? 0,
        savedSearchesCount: savedSearchesRes.count ?? 0,
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
        recentPurchases: purchases
          .slice(0, 5)
          .map(
            ({ listing: _listing, buyer: _buyer, seller: _seller, ...order }) =>
              order,
          ),
      };
    } catch (error) {
      databaseFailure("workspace.getUserWorkspaceSummary", error);
    }
  }

  async getProAnalytics(sellerId: string): Promise<ProAnalytics> {
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
        revenueByCurrency: revenueByCurrency(monthlySales),
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
