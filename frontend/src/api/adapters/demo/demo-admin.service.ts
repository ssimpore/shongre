import {
  AdminServiceContract,
  AdminStatsSummary,
} from "../../contracts/admin.contract";
import { userRepository } from "../../../repositories/user.repository";
import { listingRepository } from "../../../repositories/listing.repository";
import { transactionRepository } from "../../../repositories/transaction.repository";
import { UserProfile, AccountStatus } from "../../../types";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { authorizationService } from "../../../security/authorization.service";
import { storageService } from "../../../services/storage.service";
import { auditService } from "../../../security/audit.service";
import {
  getTrendingAdminConfig,
  updateTrendingAdminConfig,
  upsertTrendingOverride,
} from "../../../domains/trending/trending.store";
import type {
  TrendingAdminConfig,
  TrendingTopicOverride,
} from "../../../domains/trending/trending.types";
import {
  discoveryConfigurationSchema,
  type DiscoveryConfiguration,
  type DiscoveryMetrics,
} from "@shongre/contracts/discovery";
import { DEFAULT_DISCOVERY_CONFIGURATION } from "@shongre/shared";

export class DemoAdminService implements AdminServiceContract {
  private discoveryConfiguration = structuredClone(
    DEFAULT_DISCOVERY_CONFIGURATION,
  );
  private discoveryVersion = 1;
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
    status: "active" | "restricted" | "suspended" | "banned",
    reason: string,
  ): Promise<UserProfile> {
    await simulateNetworkDelay();
    if (status === "active") return userRepository.reactivateUser(userId);
    if (status === "suspended") {
      return userRepository.suspendUser(userId, reason);
    }
    const currentUser = await userRepository.getCurrentUser();
    authorizationService.assertCan(
      currentUser,
      status === "restricted"
        ? "compliance.restrict_account"
        : "user.suspend",
    );
    const user = await userRepository.getUserById(userId);
    if (!user) throw new Error("Utilisateur introuvable");
    const updated: UserProfile = {
      ...user,
      status: status as AccountStatus,
      isSuspended: status === "banned",
      suspendedReason: reason,
    };
    storageService.saveUser(updated);
    auditService.logEvent({
      actorId: currentUser!.id,
      actorName: currentUser!.name,
      actorRole: currentUser!.staffRole || currentUser!.role,
      targetId: userId,
      targetName: user.name,
      action: "user_suspended",
      details: reason,
      previousValue: { status: user.status },
      newValue: { status },
    });
    return updated;
  }

  async reviewProfessionalVerification(
    userId: string,
    approve: boolean,
    notes: string,
  ): Promise<UserProfile> {
    await simulateNetworkDelay();
    return userRepository.verifyUser(userId, { approve, notes });
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
    reportId: string,
    action: "dismiss" | "remove_listing" | "ban_user",
    reason: string,
  ): Promise<void> {
    await simulateNetworkDelay();
    const currentUser = await userRepository.getCurrentUser();
    authorizationService.assertCan(currentUser, "report.review");
    if (action === "ban_user") {
      authorizationService.assertCan(currentUser, "user.suspend");
    }
    if (action === "remove_listing") {
      authorizationService.assertCan(currentUser, "moderation.action");
    }
    storageService.resolveUserReport(reportId, reason);
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

  async getDiscoveryConfiguration(marketCode = "FR") {
    await simulateNetworkDelay();
    return { ...structuredClone(this.discoveryConfiguration), marketCode };
  }

  async getDiscoveryMetrics(marketCode = "FR"): Promise<DiscoveryMetrics> {
    await simulateNetworkDelay();
    return {
      marketCode,
      searchRequests: 1842,
      noResultRequests: 51,
      organicCandidates: 38210,
      sponsoredCandidates: 314,
      organicResults: 29268,
      sponsoredResults: 206,
      duplicateSuppressions: 423,
      diversityReranks: 781,
      privateResultCount: 14674,
      professionalResultCount: 14800,
      averageLatencyMs: 47.6,
    };
  }

  async saveDiscoveryConfiguration(
    configuration: DiscoveryConfiguration,
    changeReason: string,
    activate: boolean,
  ) {
    await simulateNetworkDelay();
    if (changeReason.trim().length < 8)
      throw new Error("Un motif détaillé est requis.");
    const parsed = discoveryConfigurationSchema.parse(configuration);
    const version = {
      ...structuredClone(parsed),
      version: `demo-discovery-v${++this.discoveryVersion}`,
    };
    if (activate) this.discoveryConfiguration = version;
    return version;
  }
}

export const demoAdminService = new DemoAdminService();
