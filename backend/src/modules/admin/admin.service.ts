import { UserProfile } from "../../shared/types/index.js";
import {
  IAdminRepository,
  IUserRepository,
  repositories,
  AdminStatsSummary,
  IModerationRepository,
} from "../../infrastructure/database/repositories/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  requirePermission,
  requireRecentAuthentication,
  type Principal,
} from "../../shared/auth/principal.js";
import {
  STAFF_ACCESS_REASON_MAX_LENGTH,
  STAFF_ACCESS_REASON_MIN_LENGTH,
  STAFF_ROLES,
  type StaffRole,
  type StaffStatus,
} from "@shongre/contracts/access-control";
import {
  sessionService,
  type SessionService,
} from "../auth/session.service.js";
import { config } from "../../app/config/index.js";

export type { AdminStatsSummary };

export class AdminService {
  constructor(
    private adminRepo: IAdminRepository = repositories.admin,
    private userRepo: IUserRepository = repositories.users,
    private moderationRepo: IModerationRepository = repositories.moderation,
    private sessions: SessionService = sessionService,
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
    if (input.userId === input.actor.userId) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Vous ne pouvez pas modifier votre propre compte.",
      });
    }
    if (previous.staffStatus === "active" && input.status !== "active") {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Suspendez ou révoquez d’abord l’accès Staff avec le contrôle renforcé prévu à cet effet.",
      });
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

  async updateStaffStatus(input: {
    userId: string;
    status: Exclude<StaffStatus, "none">;
    staffRole: StaffRole;
    reason: string;
    actor: Principal;
  }): Promise<UserProfile> {
    requirePermission(input.actor, "admin.staff.manage");
    requireRecentAuthentication(input.actor);
    if (!new Set(["active", "suspended", "revoked"]).has(input.status)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Statut Staff invalide.",
      });
    }
    if (!STAFF_ROLES.includes(input.staffRole)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Rôle Staff invalide.",
      });
    }
    const reason = String(input.reason || "").trim();
    if (
      reason.length < STAFF_ACCESS_REASON_MIN_LENGTH ||
      reason.length > STAFF_ACCESS_REASON_MAX_LENGTH
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un motif de 10 à 1 000 caractères est requis.",
      });
    }
    if (input.userId === input.actor.userId) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Vous ne pouvez pas modifier votre propre statut Staff.",
      });
    }
    if (
      input.actor.staffStatus !== "active" ||
      !["admin", "owner"].includes(input.actor.staffRole || "")
    ) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Vous ne pouvez pas administrer les accès Staff.",
      });
    }

    const previous = await this.userRepo.findById(input.userId);
    if (!previous) {
      throw new AppError({ code: "NOT_FOUND", message: "Compte introuvable." });
    }
    if (
      input.status !== "active" &&
      (previous.staffStatus ?? "none") === "none"
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Ce compte ne possède pas encore de statut Staff.",
      });
    }
    if (
      input.actor.staffRole !== "owner" &&
      (input.staffRole === "owner" || previous.staffRole === "owner")
    ) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Seul un propriétaire peut administrer ce niveau d’accès.",
      });
    }
    if (
      previous.staffStatus === input.status &&
      previous.staffRole === input.staffRole
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Ce statut Staff est déjà appliqué.",
      });
    }
    if (
      previous.staffStatus === "active" &&
      previous.staffRole === "owner" &&
      (input.status !== "active" || input.staffRole !== "owner")
    ) {
      const activeOwners = (await this.userRepo.getAll()).filter(
        (user) =>
          user.id !== previous.id &&
          user.staffStatus === "active" &&
          user.staffRole === "owner",
      );
      if (activeOwners.length === 0) {
        throw new AppError({
          code: "CONFLICT",
          message:
            "Le dernier propriétaire Staff actif ne peut pas être retiré.",
        });
      }
    }

    const updated = await this.userRepo.updateStaffAccess({
      userId: input.userId,
      status: input.status,
      staffRole: input.staffRole,
      actorId: input.actor.userId,
      reason,
    });

    // PostgreSQL audits the membership mutation in the same transaction. Demo
    // mode records the equivalent event through its owned audit repository.
    if (config.dataMode === "demo") {
      await this.adminRepo.saveAuditLog({
        actorId: input.actor.userId,
        actorName: input.actor.email,
        actorRole: input.actor.staffRole || input.actor.role,
        targetId: input.userId,
        targetName: updated.name,
        action: "staff_access_updated",
        details: reason,
        metadata: {
          previousStatus: previous.staffStatus ?? "none",
          newStatus: input.status,
          previousRole: previous.staffRole ?? null,
          newRole: input.staffRole,
        },
      });
    }

    // Authority is reloaded per request, so access disappears immediately.
    // Revocation additionally forces every device to establish a fresh session
    // and complete MFA before employee tools can be used again.
    await this.sessions.revokeAll(
      input.userId,
      undefined,
      "staff_access_changed",
    );
    logger.warn(
      `Staff actor ${input.actor.userId} changed Staff access for ${input.userId}`,
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
      action: input.approve ? "verification_approved" : "verification_rejected",
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
    await this.moderationRepo.resolveCase({
      reportId: input.reportId,
      actorId: input.actor.userId,
      action: input.action,
      reason: input.reason.trim(),
    });
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
    await this.moderationRepo.createCaseForReport({
      reportId: report.id,
      reporterId: input.reporterId,
      listingId: input.listingId,
      reportedUserId: input.reportedUserId,
      category: input.reason,
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
