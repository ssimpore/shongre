import { UserProfile } from '../../shared/types/index.js';
import { DEMO_PROFILES } from '../auth/auth.service.js';
import { logger } from '../../infrastructure/logging/logger.js';

export interface AdminStatsSummary {
  totalUsers: number;
  totalListings: number;
  activeTransactions: number;
  escrowSecuredAmount: number;
  pendingVerifications: number;
  flaggedReports: number;
}

export class AdminService {
  async getPlatformStats(): Promise<AdminStatsSummary> {
    return {
      totalUsers: 1420,
      totalListings: 5840,
      activeTransactions: 84,
      escrowSecuredAmount: 42350.0,
      pendingVerifications: 6,
      flaggedReports: 2,
    };
  }

  async getAllUsers(): Promise<UserProfile[]> {
    return Object.values(DEMO_PROFILES);
  }

  async updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned'): Promise<UserProfile> {
    const user = Object.values(DEMO_PROFILES).find((u) => u.id === userId) || DEMO_PROFILES['thomas.laurent@example.fr'];
    user.status = status;
    logger.warn(`Admin updated user ${userId} status to ${status}`);
    return user;
  }

  async getPendingReports(): Promise<Array<{ id: string; listingId: string; reason: string; reporterName: string; createdAt: string }>> {
    return [
      {
        id: 'rep_1',
        listingId: 'list_suspect',
        reason: 'Prix anormalement bas / Suspicion contrefaçon',
        reporterName: 'Thomas Laurent',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async resolveReport(reportId: string, action: 'dismiss' | 'remove_listing' | 'ban_user'): Promise<void> {
    logger.info(`Report ${reportId} resolved with action: ${action}`);
  }

  async getAuditLogs(): Promise<Array<{ id: string; timestamp: string; actor: string; action: string; target: string }>> {
    return [
      {
        id: 'audit_1',
        timestamp: new Date().toISOString(),
        actor: 'Admin System',
        action: 'escrow_auto_release',
        target: 'CMD-849201',
      },
    ];
  }
}

export const adminService = new AdminService();
