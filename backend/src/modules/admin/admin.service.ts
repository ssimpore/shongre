import { UserProfile } from '../../shared/types/index.js';
import {
  IAdminRepository,
  IUserRepository,
  repositories,
  AdminStatsSummary,
} from '../../infrastructure/database/repositories/index.js';
import { logger } from '../../infrastructure/logging/logger.js';

export type { AdminStatsSummary };

export class AdminService {
  constructor(
    private adminRepo: IAdminRepository = repositories.admin,
    private userRepo: IUserRepository = repositories.users
  ) {}

  async getPlatformStats(): Promise<AdminStatsSummary> {
    return this.adminRepo.getStats();
  }

  async getAllUsers(): Promise<UserProfile[]> {
    return this.userRepo.getAll();
  }

  async updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned'): Promise<UserProfile> {
    const updated = await this.userRepo.update(userId, { status });
    await this.adminRepo.saveAuditLog({
      actorName: 'Admin System',
      actorRole: 'admin',
      targetId: userId,
      targetName: updated.name,
      action: 'update_user_status',
      details: `User status changed to ${status}`,
    });
    logger.warn(`Admin updated user ${userId} status to ${status}`);
    return updated;
  }

  async getPendingReports(): Promise<Array<{ id: string; listingId: string; reason: string; reporterName: string; createdAt: string }>> {
    return this.adminRepo.getReports();
  }

  async resolveReport(reportId: string, action: 'dismiss' | 'remove_listing' | 'ban_user'): Promise<void> {
    await this.adminRepo.resolveReport(reportId, action);
    logger.info(`Report ${reportId} resolved with action: ${action}`);
  }

  async getAuditLogs(): Promise<Array<{ id: string; timestamp: string; actor: string; action: string; target: string }>> {
    return this.adminRepo.getAuditLogs();
  }
}

export const adminService = new AdminService();
