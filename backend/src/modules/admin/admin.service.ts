import { UserProfile } from "../../shared/types/index.js";
import {
  IAdminRepository,
  IUserRepository,
  repositories,
  AdminStatsSummary,
} from "../../infrastructure/database/repositories/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { Principal } from "../../shared/auth/principal.js";

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

  async updateUserStatus(input: {
    userId: string;
    status: "active" | "restricted" | "suspended" | "banned";
    reason: string;
    actor: Principal;
  }): Promise<UserProfile> {
    if (
      !new Set(["active", "restricted", "suspended", "banned"]).has(
        input.status,
      )
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Statut de compte invalide.",
      });
    }
    if (!input.reason || input.reason.trim().length < 10) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un motif d'au moins 10 caractères est requis.",
      });
    }
    const previous = await this.userRepo.findById(input.userId);
    if (!previous) {
      throw new AppError({ code: "NOT_FOUND", message: "Compte introuvable." });
    }
    const updated = await this.userRepo.update(input.userId, {
      status: input.status,
    });
    await this.adminRepo.saveAuditLog({
      actorId: input.actor.userId,
      actorName: input.actor.email,
      actorRole: input.actor.staffRole || input.actor.role,
      targetId: input.userId,
      targetName: updated.name,
      action: "update_user_status",
      details: input.reason.trim(),
      metadata: { previousStatus: previous.status, newStatus: input.status },
    });
    logger.warn(
      `Staff actor ${input.actor.userId} updated user ${input.userId} status to ${input.status}`,
    );
    return updated;
  }

  async reviewProfessionalVerification(input: {
    userId: string;
    approve: boolean;
    notes: string;
    actor: Principal;
  }): Promise<UserProfile> {
    if (!input.notes || input.notes.trim().length < 10) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une note de décision d'au moins 10 caractères est requise.",
      });
    }
    const previous = await this.userRepo.findById(input.userId);
    if (!previous || previous.accountType !== "professional") {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Compte professionnel introuvable.",
      });
    }
    const updated = await this.userRepo.update(input.userId, {
      isVerified: input.approve,
      isBusinessVerified: input.approve,
      status: input.approve ? "active" : "restricted",
    });
    await this.adminRepo.saveAuditLog({
      actorId: input.actor.userId,
      actorName: input.actor.email,
      actorRole: input.actor.staffRole || input.actor.role,
      targetId: input.userId,
      targetName: updated.name,
      action: input.approve
        ? "verification_approved"
        : "verification_rejected",
      details: input.notes.trim(),
      metadata: {
        previousBusinessVerification: previous.isBusinessVerified,
        approved: input.approve,
      },
    });
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

  async resolveReport(input: {
    reportId: string;
    action: "dismiss" | "remove_listing" | "ban_user";
    reason: string;
    actor: Principal;
  }): Promise<void> {
    if (!new Set(["dismiss", "remove_listing", "ban_user"]).has(input.action)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Action de modération invalide.",
      });
    }
    if (!input.reason || input.reason.trim().length < 10) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un motif d'au moins 10 caractères est requis.",
      });
    }
    await this.adminRepo.resolveReport(input.reportId, input.action);
    await this.adminRepo.saveAuditLog({
      actorId: input.actor.userId,
      actorName: input.actor.email,
      actorRole: input.actor.staffRole || input.actor.role,
      targetId: input.reportId,
      action: `report_${input.action}`,
      details: input.reason.trim(),
    });
    logger.info(
      `Staff actor ${input.actor.userId} resolved report ${input.reportId} with action ${input.action}`,
    );
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
