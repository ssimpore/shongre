import { UserProfile  } from '../../types';
import type { TrendingAdminConfig, TrendingTopicOverride } from '../../domains/trending/trending.types';

export interface AdminStatsSummary {
  totalUsers: number;
  totalListings: number;
  activeTransactions: number;
  escrowSecuredAmount: number;
  pendingVerifications: number;
  flaggedReports: number;
}

export interface AdminServiceContract {
  getPlatformStats(): Promise<AdminStatsSummary>;
  getAllUsers(): Promise<UserProfile[]>;
  updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned'): Promise<UserProfile>;
  getPendingReports(): Promise<Array<{ id: string; listingId: string; reason: string; reporterName: string; createdAt: string }>>;
  resolveReport(reportId: string, action: 'dismiss' | 'remove_listing' | 'ban_user'): Promise<void>;
  getAuditLogs(): Promise<Array<{ id: string; timestamp: string; actor: string; action: string; target: string }>>;
  getTrendingConfig(marketCode?: string): Promise<TrendingAdminConfig>;
  updateTrendingConfig(updates: Partial<TrendingAdminConfig>, marketCode?: string): Promise<TrendingAdminConfig>;
  upsertTrendingOverride(override: TrendingTopicOverride): Promise<TrendingAdminConfig>;
}
