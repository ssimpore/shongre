import {
  WorkspaceServiceContract,
  UserWorkspaceSummary,
} from "../../contracts/workspace.contract";
import { listingRepository } from "../../../repositories/listing.repository";
import { transactionRepository } from "../../../repositories/transaction.repository";
import { messagingRepository } from "../../../repositories/messaging.repository";
import { storageService } from "../../../services/storage.service";
import { Listing } from "../../../types";
import { simulateNetworkDelay } from "../../client/api-client.config";

export class DemoWorkspaceService implements WorkspaceServiceContract {
  async getUserWorkspaceSummary(userId: string): Promise<UserWorkspaceSummary> {
    await simulateNetworkDelay();
    const listings = await listingRepository.getListingsBySeller(userId);
    const purchases = await transactionRepository.getPurchases(userId);
    const sales = await transactionRepository.getSales(userId);
    const conversations =
      await messagingRepository.getUserConversations(userId);
    const favorites = storageService.getFavorites();

    const totalViews = listings.reduce(
      (sum, l) => sum + (l.viewsCount || 0),
      0,
    );
    const totalEarnings = sales
      .filter((s) => s.status === "completed")
      .reduce((sum, s) => sum + s.amount, 0);

    return {
      activeListingsCount: listings.filter((l) => l.status === "active").length,
      totalViewsCount: totalViews,
      totalFavoritesCount: favorites.length,
      unreadMessagesCount: conversations.reduce(
        (sum, c) => sum + (c.unreadCount || 0),
        0,
      ),
      pendingTransactionsCount: [...purchases, ...sales].filter(
        (t) => t.status === "payment_escrowed" || t.status === "escrow_secured",
      ).length,
      totalEarningsAmount: totalEarnings,
      recentListings: listings.slice(0, 5),
      recentPurchases: purchases.slice(0, 5),
    };
  }

  async getProAnalytics(sellerId: string): Promise<{
    monthlyRevenue: number;
    monthlyViews: number;
    conversionRate: number;
    topListings: Listing[];
  }> {
    await simulateNetworkDelay();
    const listings = await listingRepository.getListingsBySeller(sellerId);
    return {
      monthlyRevenue: 12450,
      monthlyViews: 8420,
      conversionRate: 3.8,
      topListings: listings.slice(0, 4),
    };
  }
}

export const demoWorkspaceService = new DemoWorkspaceService();
