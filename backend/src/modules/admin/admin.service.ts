import { UserProfile } from "../../shared/types/index.js";
import {
  IAdminRepository,
  IUserRepository,
  repositories,
  AdminStatsSummary,
} from "../../infrastructure/database/repositories/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { AppError } from "../../shared/errors/app-error.js";

export type { AdminStatsSummary };

export class AdminService {
  constructor(
    private adminRepo: IAdminRepository = repositories.admin,
    private userRepo: IUserRepository = repositories.users,
  ) {}

  async getPlatformStats(): Promise<AdminStatsSummary> {
    return this.adminRepo.getStats();
  }

  async getAllUsers(): Promise<UserProfile[]> {
    return this.userRepo.getAll();
  }

  async updateUserStatus(
    userId: string,
    status: "active" | "suspended" | "banned",
  ): Promise<UserProfile> {
    const updated = await this.userRepo.update(userId, { status });
    await this.adminRepo.saveAuditLog({
      actorName: "Admin System",
      actorRole: "admin",
      targetId: userId,
      targetName: updated.name,
      action: "update_user_status",
      details: `User status changed to ${status}`,
    });
    logger.warn(`Admin updated user ${userId} status to ${status}`);
    return updated;
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
    return this.adminRepo.getReports();
  }

  async resolveReport(
    reportId: string,
    action: "dismiss" | "remove_listing" | "ban_user",
  ): Promise<void> {
    await this.adminRepo.resolveReport(reportId, action);
    logger.info(`Report ${reportId} resolved with action: ${action}`);
  }

  async submitReport(input: {
    reporterId: string;
    listingId?: string;
    reportedUserId?: string;
    reason?: string;
    details?: string;
  }): Promise<{ id: string; status: "pending" }> {
    const reasons = new Set([
      "fraud",
      "counterfeit",
      "prohibited",
      "harassment",
      "other",
    ]);
    if (!input.listingId && !input.reportedUserId) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une annonce ou un utilisateur doit être signalé.",
      });
    }
    if (!input.reason || !reasons.has(input.reason)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Motif de signalement invalide.",
      });
    }
    if (
      !input.details ||
      input.details.trim().length < 10 ||
      input.details.length > 2000
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Le détail du signalement doit contenir entre 10 et 2 000 caractères.",
      });
    }
    if (input.reportedUserId === input.reporterId) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Vous ne pouvez pas signaler votre propre compte.",
      });
    }
    const report = await this.adminRepo.createReport({
      reporterId: input.reporterId,
      listingId: input.listingId,
      reportedUserId: input.reportedUserId,
      reason: input.reason,
      details: input.details.trim(),
    });
    return { ...report, status: "pending" };
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
    return this.adminRepo.getAuditLogs();
  }
}

export const adminService = new AdminService();
