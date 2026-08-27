import { PublicSellerProfile, UserProfile } from "../../shared/types/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  IUserRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import type {
  IOrderRepository,
  IAdminRepository,
} from "../../infrastructure/database/repositories/index.js";
import { verifyPassword } from "../../shared/auth/password.js";
import { accountDeletionRequestSchema } from "@shongre/contracts/account";
import {
  authRepository,
  type IAuthRepository,
} from "../../infrastructure/database/repositories/auth.repository.js";
import type { AuthProvider } from "../../shared/auth/identity.js";
import { analyticsService } from "../analytics/analytics.service.js";

export class UsersService {
  constructor(
    private userRepo: IUserRepository = repositories.users,
    private orderRepo: IOrderRepository = repositories.orders,
    private adminRepo: IAdminRepository = repositories.admin,
    private authRepo: IAuthRepository = authRepository,
  ) {}

  async getUserById(id: string): Promise<UserProfile | null> {
    return this.userRepo.findById(id);
  }

  async getPublicUserById(id: string): Promise<PublicSellerProfile | null> {
    return this.userRepo.findPublicById(id);
  }

  async updateUserProfile(
    id: string,
    updates: Partial<UserProfile>,
  ): Promise<UserProfile> {
    const existing = await this.getUserById(id);
    if (!existing) {
      throw new AppError({
        code: "NOT_FOUND",
        message: `User ${id} not found`,
      });
    }
    return this.userRepo.update(id, updates);
  }

  async deleteOwnAccount(
    userId: string,
    password: string,
    reason?: string,
  ): Promise<{ status: "completed" }> {
    const parsed = accountDeletionRequestSchema.safeParse({ password, reason });
    if (!parsed.success) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Demande invalide.",
      });
    }
    const request = parsed.data;

    const user = await this.userRepo.findById(userId);
    if (!user || user.status !== "active") {
      throw new AppError({ code: "NOT_FOUND", message: "Compte introuvable." });
    }
    const credential = await this.userRepo.findCredentialByUserId(userId);
    if (!(await verifyPassword(request.password, credential?.passwordHash))) {
      throw new AppError({
        code: "UNAUTHENTICATED",
        message: "Le mot de passe de confirmation est incorrect.",
      });
    }

    await this.deleteAccountData(user, request.reason?.trim() || undefined);
    return { status: "completed" };
  }

  async deleteFromVerifiedProvider(
    userId: string,
    provider: Exclude<AuthProvider, "password">,
    providerSubject: string,
  ): Promise<{ status: "completed" }> {
    const [user, identity] = await Promise.all([
      this.userRepo.findById(userId),
      this.authRepo.findIdentity(provider, providerSubject),
    ]);
    if (!user || !identity || identity.userId !== userId) {
      throw new AppError({ code: "NOT_FOUND", message: "Compte introuvable." });
    }
    if (user.status === "deleted") return { status: "completed" };
    if (user.status !== "active") {
      throw new AppError({
        code: "CONFLICT",
        message: "La suppression doit être examinée par le support.",
      });
    }
    await this.deleteAccountData(
      user,
      `Verified ${provider} data-deletion request`,
    );
    return { status: "completed" };
  }

  private async deleteAccountData(
    user: UserProfile,
    reason?: string,
  ): Promise<void> {
    const userId = user.id;
    const [purchases, sales] = await Promise.all([
      this.orderRepo.getPurchases(userId),
      this.orderRepo.getSales(userId),
    ]);
    const terminal = new Set(["completed", "refunded", "cancelled"]);
    if ([...purchases, ...sales].some((order) => !terminal.has(order.status))) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Une transaction, livraison ou contestation est encore en cours. Terminez-la avant de supprimer le compte.",
      });
    }

    await analyticsService.anonymizeSubject(userId);
    await this.userRepo.anonymize(userId, reason);
    await Promise.all([
      this.authRepo.revokeSessions(userId, "account_deleted"),
      this.authRepo.deleteIdentities(userId),
    ]);
    await this.authRepo.recordSecurityEvent({
      userId,
      eventType: "account_deleted",
    });
    await this.adminRepo.saveAuditLog({
      actorId: userId,
      actorName: "Self-service account deletion",
      actorRole: user.role,
      targetId: userId,
      targetName: "Deleted account",
      action: "account_deleted",
      details: "Access revoked and eligible profile data anonymized.",
    });
  }
}

export const usersService = new UsersService();
