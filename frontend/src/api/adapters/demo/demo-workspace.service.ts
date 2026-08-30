import {
  ProAnalyticsSnapshot,
  WorkspaceServiceContract,
  UserWorkspaceSummary,
} from "../../contracts/workspace.contract";
import { listingRepository } from "../../../repositories/listing.repository";
import { transactionRepository } from "../../../repositories/transaction.repository";
import { messagingRepository } from "../../../repositories/messaging.repository";
import { storageService } from "../../../services/storage.service";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { requireDemoCapability } from "./demo-authorization";

const DEMO_WEEKLY_ANALYTICS = [
  { date: "2026-08-17", views: 240, leads: 12 },
  { date: "2026-08-18", views: 310, leads: 18 },
  { date: "2026-08-19", views: 420, leads: 24 },
  { date: "2026-08-20", views: 390, leads: 19 },
  { date: "2026-08-21", views: 560, leads: 32 },
  { date: "2026-08-22", views: 680, leads: 41 },
  { date: "2026-08-23", views: 720, leads: 48 },
];

export class DemoWorkspaceService implements WorkspaceServiceContract {
  async getUserWorkspaceSummary(userId: string): Promise<UserWorkspaceSummary> {
    requireDemoCapability("marketplace.customer.access");
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

  async getProAnalytics(sellerId: string): Promise<ProAnalyticsSnapshot> {
    requireDemoCapability("store.analytics.read.own");
    await simulateNetworkDelay();
    const listings = await listingRepository.getListingsBySeller(sellerId);
    const hasCatalogue = listings.length > 0;
    return {
      monthlyRevenue: {
        amountMinor: hasCatalogue ? 1_425_000 : 0,
        currency: "EUR",
      },
      monthlyViews: hasCatalogue
        ? listings.reduce(
            (sum, listing) =>
              sum + (listing.viewsCount ?? listing.viewCount ?? 0),
            0,
          )
        : 0,
      contactsCount: hasCatalogue ? 194 : 0,
      conversionRate: hasCatalogue ? 5.8 : 0,
      weeklyViewsChangePercent: hasCatalogue ? 18.4 : 0,
      weeklyContactsChangePercent: hasCatalogue ? 12.1 : 0,
      weeklyStats: hasCatalogue ? DEMO_WEEKLY_ANALYTICS : [],
      topListings: listings.slice(0, 5).map((listing, index) => ({
        listing,
        conversionRate: Number((8.2 - index * 0.6).toFixed(1)),
      })),
    };
  }
}

export const demoWorkspaceService = new DemoWorkspaceService();
