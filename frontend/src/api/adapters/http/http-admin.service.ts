import {
  AdminServiceContract,
  AdminStatsSummary,
} from "../../contracts/admin.contract";
import { httpClient } from "./http-client";
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

export class HttpAdminService implements AdminServiceContract {
  async getPlatformStats(): Promise<AdminStatsSummary> {
    return httpClient.get<AdminStatsSummary>("/admin/stats");
  }

  async getAllUsers(): Promise<UserProfile[]> {
    return httpClient.get<UserProfile[]>("/admin/users");
  }

  async updateUserStatus(
    userId: string,
    status: "active" | "restricted" | "suspended" | "banned",
    reason: string,
  ): Promise<UserProfile> {
    return httpClient.put<UserProfile>(`/admin/users/${userId}/status`, {
      status,
      reason,
    });
  }

  async reviewProfessionalVerification(
    userId: string,
    approve: boolean,
    notes: string,
  ): Promise<UserProfile> {
    return httpClient.put<UserProfile>(`/admin/users/${userId}/verification`, {
      approve,
      notes,
    });
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
    return httpClient.get<
      Array<{
        id: string;
        listingId: string;
        reason: string;
        reporterName: string;
        createdAt: string;
      }>
    >("/admin/reports");
  }

  async resolveReport(
    reportId: string,
    action: "dismiss" | "remove_listing" | "ban_user",
    reason: string,
  ): Promise<void> {
    return httpClient.post<void>(`/admin/reports/${reportId}/resolve`, {
      action,
      reason,
    });
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
    return httpClient.get<
      Array<{
        id: string;
        timestamp: string;
        actor: string;
        action: string;
        target: string;
      }>
    >("/admin/audit-logs");
  }

  async getTrendingConfig(
    marketCode = DEFAULT_MARKET_CODE,
  ): Promise<TrendingAdminConfig> {
    return httpClient.get<TrendingAdminConfig>("/admin/trending/config", {
      params: { market: marketCode },
    });
  }

  async updateTrendingConfig(
    updates: Partial<TrendingAdminConfig>,
    marketCode = DEFAULT_MARKET_CODE,
  ): Promise<TrendingAdminConfig> {
    return httpClient.put<TrendingAdminConfig>(
      "/admin/trending/config",
      updates,
      { params: { market: marketCode } },
    );
  }

  async upsertTrendingOverride(
    override: TrendingTopicOverride,
  ): Promise<TrendingAdminConfig> {
    return httpClient.put<TrendingAdminConfig>(
      `/admin/trending/overrides/${encodeURIComponent(override.topicKey)}`,
      override,
    );
  }

  async getDiscoveryConfiguration(marketCode = DEFAULT_MARKET_CODE) {
    return httpClient.get<DiscoveryConfiguration>(
      "/admin/discovery/configuration",
      { params: { marketCode } },
    );
  }

  async getDiscoveryMetrics(marketCode = DEFAULT_MARKET_CODE) {
    return httpClient.get<DiscoveryMetrics>("/admin/discovery/metrics", {
      params: { marketCode },
    });
  }

  async saveDiscoveryConfiguration(
    configuration: DiscoveryConfiguration,
    changeReason: string,
    activate: boolean,
  ) {
    return httpClient.post<DiscoveryConfiguration>(
      `/admin/discovery/configuration/${activate ? "publish" : "drafts"}`,
      { configuration, changeReason },
    );
  }
}

export const httpAdminService = new HttpAdminService();
