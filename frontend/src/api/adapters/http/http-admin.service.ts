import {
  AdminServiceContract,
  AdminStatsSummary,
} from "../../contracts/admin.contract";
import { apiOperation } from "./generated-api-operation";
import { UserProfile } from "../../../types";
import type {
  TrendingAdminConfig,
  TrendingTopicOverride,
} from "../../../domains/trending/trending.types";
import type {
  DiscoveryConfiguration,
  DiscoveryMetrics,
} from "@shongre/contracts/discovery";
import { DEFAULT_MARKET_CODE } from "../../../configuration/market-baseline";
import type { StaffRole, StaffStatus } from "@shongre/contracts/access-control";
import type {
  CapabilityManagementProjection,
  CapabilityOverrideUpdate,
} from "@shongre/contracts/access-control";

export class HttpAdminService implements AdminServiceContract {
  async getPlatformStats(): Promise<AdminStatsSummary> {
    return apiOperation<AdminStatsSummary, "getAdminStats">(
      "getAdminStats",
      {},
    );
  }

  async getAllUsers(): Promise<UserProfile[]> {
    return apiOperation<UserProfile[], "getAdminUsers">("getAdminUsers", {});
  }

  async getCapabilityOverrides(
    userId: string,
  ): Promise<CapabilityManagementProjection> {
    return apiOperation<
      CapabilityManagementProjection,
      "getAdminUserCapabilities"
    >("getAdminUserCapabilities", { path: { userId: userId } });
  }

  async updateCapabilityOverrides(
    userId: string,
    update: CapabilityOverrideUpdate,
  ): Promise<CapabilityManagementProjection> {
    return apiOperation<
      CapabilityManagementProjection,
      "updateAdminUserCapabilityOverrides"
    >("updateAdminUserCapabilityOverrides", {
      path: { userId: userId },
      body: update,
    });
  }

  async updateUserStatus(
    userId: string,
    status: "active" | "restricted" | "suspended" | "banned",
    reason: string,
  ): Promise<UserProfile> {
    return apiOperation<UserProfile, "putAdminUsersByUserIdStatus">(
      "putAdminUsersByUserIdStatus",
      {
        path: { userId: userId },
        body: {
          status,
          reason,
        },
      },
    );
  }

  async updateStaffStatus(
    userId: string,
    status: Exclude<StaffStatus, "none">,
    staffRole: StaffRole,
    reason: string,
  ): Promise<UserProfile> {
    return apiOperation<UserProfile, "updateAdminUserStaffStatus">(
      "updateAdminUserStaffStatus",
      {
        path: { userId: userId },
        body: {
          status,
          staffRole,
          reason,
        },
      },
    );
  }

  async reviewProfessionalVerification(
    userId: string,
    approve: boolean,
    notes: string,
  ): Promise<UserProfile> {
    return apiOperation<UserProfile, "putAdminUsersByUserIdVerification">(
      "putAdminUsersByUserIdVerification",
      {
        path: { userId: userId },
        body: {
          approve,
          notes,
        },
      },
    );
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
    return apiOperation<
      Array<{
        id: string;
        listingId: string;
        reason: string;
        reporterName: string;
        createdAt: string;
      }>,
      "getAdminReports"
    >("getAdminReports", {});
  }

  async resolveReport(
    reportId: string,
    action: "dismiss" | "remove_listing" | "ban_user",
    reason: string,
  ): Promise<void> {
    return apiOperation<void, "postAdminReportsByReportIdResolve">(
      "postAdminReportsByReportIdResolve",
      {
        path: { reportId: reportId },
        body: {
          action,
          reason,
        },
      },
    );
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
    return apiOperation<
      Array<{
        id: string;
        timestamp: string;
        actor: string;
        action: string;
        target: string;
      }>,
      "getAdminAuditLogs"
    >("getAdminAuditLogs", {});
  }

  async getTrendingConfig(
    marketCode = DEFAULT_MARKET_CODE,
  ): Promise<TrendingAdminConfig> {
    return apiOperation<TrendingAdminConfig, "getAdminTrendingConfig">(
      "getAdminTrendingConfig",
      { query: { market: marketCode } },
    );
  }

  async updateTrendingConfig(
    updates: Partial<TrendingAdminConfig>,
    marketCode = DEFAULT_MARKET_CODE,
  ): Promise<TrendingAdminConfig> {
    return apiOperation<TrendingAdminConfig, "putAdminTrendingConfig">(
      "putAdminTrendingConfig",
      { query: { market: marketCode }, body: updates },
    );
  }

  async upsertTrendingOverride(
    override: TrendingTopicOverride,
  ): Promise<TrendingAdminConfig> {
    return apiOperation<
      TrendingAdminConfig,
      "putAdminTrendingOverridesByTopicKey"
    >("putAdminTrendingOverridesByTopicKey", {
      path: { topicKey: override.topicKey },
      body: override,
    });
  }

  async getDiscoveryConfiguration(marketCode = DEFAULT_MARKET_CODE) {
    return apiOperation<
      DiscoveryConfiguration,
      "getAdminDiscoveryConfiguration"
    >("getAdminDiscoveryConfiguration", { query: { marketCode } });
  }

  async getDiscoveryMetrics(marketCode = DEFAULT_MARKET_CODE) {
    return apiOperation<DiscoveryMetrics, "getAdminDiscoveryMetrics">(
      "getAdminDiscoveryMetrics",
      { query: { marketCode } },
    );
  }

  async saveDiscoveryConfiguration(
    configuration: DiscoveryConfiguration,
    changeReason: string,
    activate: boolean,
  ) {
    const input = { body: { configuration, changeReason } };
    return activate
      ? apiOperation<
          DiscoveryConfiguration,
          "postAdminDiscoveryConfigurationPublish"
        >("postAdminDiscoveryConfigurationPublish", input)
      : apiOperation<
          DiscoveryConfiguration,
          "postAdminDiscoveryConfigurationDrafts"
        >("postAdminDiscoveryConfigurationDrafts", input);
  }
}

export const httpAdminService = new HttpAdminService();
