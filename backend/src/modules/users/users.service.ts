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
import { accountDeletionRequestSchema } from "@shongre/contracts/account";
import {
  professionalAccountUpgradeSchema,
  type ProfessionalAccountUpgrade,
} from "@shongre/contracts";
import {
  authRepository,
  type IAuthRepository,
} from "../../infrastructure/database/repositories/auth.repository.js";
import type { AuthProvider } from "../../shared/auth/identity.js";
import { analyticsService } from "../analytics/analytics.service.js";
import type { DeliveryRepository } from "../../infrastructure/database/repositories/delivery.repository.js";
import {
  createPasswordIdentityProvider,
  type PasswordIdentityProvider,
} from "../auth/password-identity.provider.js";

export class UsersService {
  private readonly passwordIdentity: PasswordIdentityProvider;

  constructor(
    private userRepo: IUserRepository = repositories.users,
    private orderRepo: IOrderRepository = repositories.orders,
    private adminRepo: IAdminRepository = repositories.admin,
    private authRepo: IAuthRepository = authRepository,
    private deliveryRepo: DeliveryRepository = repositories.delivery,
    passwordIdentity?: PasswordIdentityProvider,
  ) {
    this.passwordIdentity =
      passwordIdentity ?? createPasswordIdentityProvider(userRepo);
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    return this.userRepo.findById(id);
  }

  async getPublicUserById(id: string): Promise<PublicSellerProfile | null> {
    const direct = await this.userRepo.findPublicById(id);
    if (direct) return direct;
    const users = await this.userRepo.getAll();
    const match = users.find((user) => user.slug === id);
    return match ? this.userRepo.findPublicById(match.id) : null;
  }

  async listPublicProfessionals(
    marketCode: string,
  ): Promise<PublicSellerProfile[]> {
    const users = await this.userRepo.getAll();
    const candidates = users.filter(
      (user) =>
        user.accountType === "professional" &&
        user.status === "active" &&
        user.staffStatus === "none" &&
        user.country.toUpperCase() === marketCode.toUpperCase(),
    );
    const profiles = await Promise.all(
      candidates.map((user) => this.userRepo.findPublicById(user.id)),
    );
    return profiles.filter(
      (profile): profile is PublicSellerProfile => profile !== null,
    );
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

  async upgradeOwnAccount(
    userId: string,
    input: ProfessionalAccountUpgrade,
  ): Promise<UserProfile> {
    const parsed = professionalAccountUpgradeSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          parsed.error.issues[0]?.message ??
          "Les informations professionnelles sont invalides.",
      });
    }
    const upgraded = await this.userRepo.upgradeToProfessional(
      userId,
      parsed.data,
    );
    await this.authRepo.recordSecurityEvent({
      userId,
      eventType: "account_type_upgraded_to_pro",
      metadata: {
        professionalVertical: upgraded.professionalVertical ?? null,
      },
    });
    return upgraded;
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
    if (
      !(await this.passwordIdentity.authenticate(
        user,
        user.email,
        request.password,
      ))
    ) {
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
    const authUserId = await this.userRepo.findAuthUserId(userId);
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

    try {
      await this.deliveryRepo.prepareAccountDeletion(userId);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "DELIVERY_ACTIVE_ASSIGNMENT"
      ) {
        throw new AppError({
          code: "CONFLICT",
          message:
            "Une livraison est encore en cours. Terminez-la ou annulez-la avant de supprimer le compte.",
        });
      }
      throw error;
    }
    await analyticsService.anonymizeSubject(userId);
    await this.userRepo.anonymize(userId, reason);
    await this.passwordIdentity.deleteAuthUser(authUserId);
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
