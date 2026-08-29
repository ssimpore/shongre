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
  discoveryChangeReasonSchema,
  type DiscoveryConfiguration,
  type DiscoveryMetrics,
} from "@shongre/contracts/discovery";
import { DEFAULT_DISCOVERY_CONFIGURATION } from "@shongre/shared";
import { DEFAULT_MARKET_CODE } from "../../../configuration/market-baseline";
import type { StaffRole, StaffStatus } from "@shongre/contracts/access-control";
import {
  CAPABILITIES,
  CAPABILITY_OVERRIDE_REASON_MAX_LENGTH,
  CAPABILITY_OVERRIDE_REASON_MIN_LENGTH,
  OWNER_ONLY_CAPABILITIES,
  canonicalAccessContext,
  resolveCapabilityFacts,
  type Capability,
  type CapabilityManagementProjection,
  type CapabilityOverrideUpdate,
} from "@shongre/contracts/access-control";
import { ALL_PERMISSIONS } from "../../../security/permissions";
import { authService as demoAuthEngine } from "../../../domains/auth/auth.service";

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

  async getCapabilityOverrides(
    userId: string,
  ): Promise<CapabilityManagementProjection> {
    await simulateNetworkDelay();
    const actor = await userRepository.getCurrentUser();
    authorizationService.assertCan(actor, "admin.permissions.manage");
    const user = await userRepository.getUserById(userId);
    if (!user) throw new Error("Utilisateur introuvable");
    return this.capabilityProjection(user);
  }

  async updateCapabilityOverrides(
    userId: string,
    update: CapabilityOverrideUpdate,
  ): Promise<CapabilityManagementProjection> {
    await simulateNetworkDelay();
    const actor = await userRepository.getCurrentUser();
    authorizationService.assertCan(actor, "admin.permissions.manage");
    if (!actor || actor.staffStatus !== "active") {
      throw new Error("Un statut Staff actif est requis.");
    }
    if (actor.id === userId) {
      throw new Error("Vous ne pouvez pas modifier vos propres permissions.");
    }
    const reason = String(update.reason || "").trim();
    if (
      reason.length < CAPABILITY_OVERRIDE_REASON_MIN_LENGTH ||
      reason.length > CAPABILITY_OVERRIDE_REASON_MAX_LENGTH
    ) {
      throw new Error("Un motif de 10 à 1 000 caractères est requis.");
    }
    if (
      !Number.isSafeInteger(update.expectedVersion) ||
      update.expectedVersion < 1
    ) {
      throw new Error("Version de permissions invalide.");
    }
    const customPermissions = this.validateCapabilities(
      update.customPermissions,
    );
    const revokedPermissions = this.validateCapabilities(
      update.revokedPermissions,
    );
    const revokedSet = new Set(revokedPermissions);
    if (customPermissions.some((capability) => revokedSet.has(capability))) {
      throw new Error(
        "Une permission ne peut pas être accordée et révoquée simultanément.",
      );
    }
    const user = await userRepository.getUserById(userId);
    if (!user) throw new Error("Utilisateur introuvable");
    if (user.staffRole === "owner" && actor.staffRole !== "owner") {
      throw new Error("Seul un propriétaire peut modifier un propriétaire.");
    }
    if (
      actor.staffRole !== "owner" &&
      customPermissions.some((capability) =>
        OWNER_ONLY_CAPABILITIES.includes(
          capability as (typeof OWNER_ONLY_CAPABILITIES)[number],
        ),
      )
    ) {
      throw new Error(
        "Seul un propriétaire peut accorder cette permission de gouvernance.",
      );
    }
    const version = user.capabilityOverrideVersion ?? 1;
    if (version !== update.expectedVersion) {
      throw new Error(
        "Les permissions ont été modifiées par une autre session.",
      );
    }
    const updated: UserProfile = {
      ...user,
      customPermissions,
      revokedPermissions,
      capabilityOverrideVersion: version + 1,
    };
    storageService.saveUser(updated);
    auditService.logEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.staffRole || actor.role,
      targetId: user.id,
      targetName: user.name,
      action: "capability_overrides_updated",
      details: reason,
      previousValue: {
        customPermissions: user.customPermissions ?? [],
        revokedPermissions: user.revokedPermissions ?? [],
        version,
      },
      newValue: {
        customPermissions,
        revokedPermissions,
        version: version + 1,
        requestId: `demo-capability-${actor.id}-${user.id}-${version + 1}`,
      },
    });
    demoAuthEngine
      .getUserSessions(user.id)
      .forEach((session) => demoAuthEngine.revokeSession(session.id));
    return this.capabilityProjection(updated);
  }

  private validateCapabilities(value: unknown): Capability[] {
    if (!Array.isArray(value))
      throw new Error("Collection de permissions invalide.");
    const capabilities = value.map(String) as Capability[];
    if (new Set(capabilities).size !== capabilities.length) {
      throw new Error("Une permission ne peut apparaître qu’une seule fois.");
    }
    const known = new Set<string>(CAPABILITIES);
    if (capabilities.some((capability) => !known.has(capability))) {
      throw new Error("Une permission demandée est inconnue.");
    }
    return capabilities.sort();
  }

  private capabilityProjection(
    user: UserProfile,
  ): CapabilityManagementProjection {
    const access = canonicalAccessContext(user);
    const presentation = new Map(
      ALL_PERMISSIONS.map((permission) => [permission.id, permission]),
    );
    return {
      userId: user.id,
      accountType:
        access.accountType === "professional" ? "professional" : "individual",
      staffStatus: access.staffStatus,
      staffRole: access.staffRole ?? null,
      version: user.capabilityOverrideVersion ?? 1,
      capabilities: resolveCapabilityFacts(user).map((fact) => ({
        ...fact,
        label: presentation.get(fact.capability)?.name ?? fact.capability,
        category:
          presentation.get(fact.capability)?.category ??
          "Administration Système",
      })),
    };
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
      status === "restricted" ? "compliance.restrict_account" : "user.suspend",
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

  async updateStaffStatus(
    userId: string,
    status: Exclude<StaffStatus, "none">,
    staffRole: StaffRole,
    reason: string,
  ): Promise<UserProfile> {
    await simulateNetworkDelay();
    const actor = await userRepository.getCurrentUser();
    authorizationService.assertCan(actor, "admin.staff.manage");
    if (!actor || actor.staffStatus !== "active") {
      throw new Error("Un statut Staff actif est requis.");
    }
    if (actor.id === userId) {
      throw new Error("Vous ne pouvez pas modifier votre propre statut Staff.");
    }
    if (reason.trim().length < 10) {
      throw new Error("Un motif d’au moins 10 caractères est requis.");
    }
    const user = await userRepository.getUserById(userId);
    if (!user) throw new Error("Utilisateur introuvable");
    if (
      actor.staffRole !== "owner" &&
      (staffRole === "owner" || user.staffRole === "owner")
    ) {
      throw new Error("Seul un propriétaire peut gérer ce niveau d’accès.");
    }
    const updated: UserProfile = {
      ...user,
      staffStatus: status,
      staffRole,
    };
    storageService.saveUser(updated);
    auditService.logEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.staffRole || actor.role,
      targetId: userId,
      targetName: user.name,
      action: status === "revoked" ? "role_removed" : "role_assigned",
      details: reason.trim(),
      previousValue: {
        staffStatus: user.staffStatus ?? "none",
        staffRole: user.staffRole ?? null,
      },
      newValue: { staffStatus: status, staffRole },
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

  async getTrendingConfig(
    marketCode = DEFAULT_MARKET_CODE,
  ): Promise<TrendingAdminConfig> {
    await simulateNetworkDelay();
    return getTrendingAdminConfig(marketCode);
  }

  async updateTrendingConfig(
    updates: Partial<TrendingAdminConfig>,
    marketCode = DEFAULT_MARKET_CODE,
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

  async getDiscoveryConfiguration(marketCode = DEFAULT_MARKET_CODE) {
    await simulateNetworkDelay();
    return { ...structuredClone(this.discoveryConfiguration), marketCode };
  }

  async getDiscoveryMetrics(
    marketCode = DEFAULT_MARKET_CODE,
  ): Promise<DiscoveryMetrics> {
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
    const reason = discoveryChangeReasonSchema.safeParse(changeReason);
    if (!reason.success) throw new Error("Un motif détaillé est requis.");
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
