import {
  AdminServiceContract,
  AdminStatsSummary,
} from "../../contracts/admin.contract";
import { userRepository } from "../../../repositories/user.repository";
import { listingRepository } from "../../../repositories/listing.repository";
import { transactionRepository } from "../../../repositories/transaction.repository";
import { UserProfile, AccountStatus } from "../../../types";
import { simulateNetworkDelay } from "../../client/api-client.config";
import {
  getTrendingAdminConfig,
  updateTrendingAdminConfig,
  upsertTrendingOverride,
} from "../../../domains/trending/trending.store";
import type {
  TrendingAdminConfig,
  TrendingTopicOverride,
} from "../../../domains/trending/trending.types";

export class DemoAdminService implements AdminServiceContract {
  async getPlatformStats(): Promise<AdminStatsSummary> {
    await simulateNetworkDelay();
    const users = await userRepository.getAllUsers();
    const { total } = await listingRepository.getListings();
    const purchases = await transactionRepository.getPurchases("buyer_thomas");
    const sales = await transactionRepository.getSales("pro_auto_paris");
    const activeTxs = [...purchases, ...sales].filter(
      (t) => t.status === "payment_escrowed" || t.status === "escrow_secured",
    );

    return {
      totalUsers: users.length,
      totalListings: total,
      activeTransactions: activeTxs.length,
      escrowSecuredAmount: activeTxs.reduce((sum, t) => sum + t.totalAmount, 0),
      pendingVerifications: 4,
      flaggedReports: 2,
    };
  }

  async getAllUsers(): Promise<UserProfile[]> {
    await simulateNetworkDelay();
    return userRepository.getAllUsers();
  }

  async updateUserStatus(
    userId: string,
    status: "active" | "suspended" | "banned",
  ): Promise<UserProfile> {
    await simulateNetworkDelay();
    const user = await userRepository.getUserById(userId);
    if (!user) throw new Error("Utilisateur introuvable");
    const normalizedStatus: AccountStatus =
      status === "banned" ? "suspended" : status;
    return userRepository.updateProfile(userId, { status: normalizedStatus });
  }

  async getPendingReports(): Promise<
    Array<{
      id: string;
      listingId: string;
      reason: string;
      reporterName: string;
      createdAt: string;
    }>
  > {
    await simulateNetworkDelay();
    return [
      {
        id: "rep-1",
        listingId: "l1",
        reason: "Prix manifestement suspect / suspicion de contrefaçon",
        reporterName: "Claire D.",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "rep-2",
        listingId: "l4",
        reason: "Photos non conformes aux règles de publication",
        reporterName: "Julien M.",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  }

  async resolveReport(
    _reportId: string,
    _action: "dismiss" | "remove_listing" | "ban_user",
  ): Promise<void> {
    await simulateNetworkDelay();
  }

  async getAuditLogs(): Promise<
    Array<{
      id: string;
      timestamp: string;
      actor: string;
      action: string;
      target: string;
    }>
  > {
    await simulateNetworkDelay();
    return [
      {
        id: "log-1",
        timestamp: new Date(Date.now() - 120000).toISOString(),
        actor: "Admin Marc",
        action: "MARKET_CONFIG_UPDATE",
        target: "BE (Belgique)",
      },
      {
        id: "log-2",
        timestamp: new Date(Date.now() - 600000).toISOString(),
        actor: "Moderation Bot",
        action: "AUTO_FLAG_SUSPICIOUS_PRICE",
        target: "Listing #l12",
      },
    ];
  }

  async getTrendingConfig(marketCode = "FR"): Promise<TrendingAdminConfig> {
    await simulateNetworkDelay();
    return getTrendingAdminConfig(marketCode);
  }

  async updateTrendingConfig(
    updates: Partial<TrendingAdminConfig>,
    marketCode = "FR",
  ): Promise<TrendingAdminConfig> {
    await simulateNetworkDelay();
    return updateTrendingAdminConfig(updates, marketCode);
  }

  async upsertTrendingOverride(
    override: TrendingTopicOverride,
  ): Promise<TrendingAdminConfig> {
    await simulateNetworkDelay();
    return upsertTrendingOverride(override);
  }
}

export const demoAdminService = new DemoAdminService();
