import { UserProfile } from "../../types";
import type {
  TrendingAdminConfig,
  TrendingTopicOverride,
} from "../../domains/trending/trending.types";
import type {
  DiscoveryConfiguration,
  DiscoveryMetrics,
} from "@shongre/contracts/discovery";
import type { StaffRole, StaffStatus } from "@shongre/contracts/access-control";

export interface AdminStatsSummary {
  totalUsers: number;
  totalListings: number;
  activeTransactions: number;
  escrowSecuredAmount: number;
  pendingVerifications: number;
  flaggedReports: number;
}

export interface AdminReportSummary {
  id: string;
  listingId: string;
  reason: string;
  reporterName: string;
  createdAt: string;
}

export interface AdminAuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
}

export interface AdminServiceContract {
  getPlatformStats(): Promise<AdminStatsSummary>;
  getAllUsers(): Promise<UserProfile[]>;
  updateUserStatus(
    userId: string,
    status: "active" | "restricted" | "suspended" | "banned",
    reason: string,
  ): Promise<UserProfile>;
  updateStaffStatus(
    userId: string,
    status: Exclude<StaffStatus, "none">,
    staffRole: StaffRole,
    reason: string,
  ): Promise<UserProfile>;
  reviewProfessionalVerification(
    userId: string,
    approve: boolean,
    notes: string,
  ): Promise<UserProfile>;
  getPendingReports(): Promise<AdminReportSummary[]>;
  resolveReport(
    reportId: string,
    action: "dismiss" | "remove_listing" | "ban_user",
    reason: string,
  ): Promise<void>;
  getAuditLogs(): Promise<AdminAuditLogEntry[]>;
  getTrendingConfig(marketCode?: string): Promise<TrendingAdminConfig>;
  updateTrendingConfig(
    updates: Partial<TrendingAdminConfig>,
    marketCode?: string,
  ): Promise<TrendingAdminConfig>;
  upsertTrendingOverride(
    override: TrendingTopicOverride,
  ): Promise<TrendingAdminConfig>;
  getDiscoveryConfiguration(
    marketCode?: string,
  ): Promise<DiscoveryConfiguration>;
  getDiscoveryMetrics(marketCode?: string): Promise<DiscoveryMetrics>;
  saveDiscoveryConfiguration(
    configuration: DiscoveryConfiguration,
    changeReason: string,
    activate: boolean,
  ): Promise<DiscoveryConfiguration>;
}
