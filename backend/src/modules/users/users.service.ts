import { z } from "zod";
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
import type {
  IListingRepository,
  IMessagingRepository,
  INotificationRepository,
  IReviewRepository,
  IVerificationRepository,
  IWatchSubscriptionRepository,
} from "../../infrastructure/database/repositories/index.js";
import type { components } from "@shongre/contracts/openapi";
import {
  createPasswordIdentityProvider,
  type PasswordIdentityProvider,
} from "../auth/password-identity.provider.js";
import { sha256 } from "../auth/oauth-provider.client.js";

/** Mirrors `AccountAwayRequest`; the database bounds the window again. */
const accountAwayRequestSchema = z.object({
  until: z.string().datetime({ offset: true }).nullable(),
  message: z.string().trim().max(300).optional(),
});

export class UsersService {
  /** Full-account reads are expensive; one copy a day is enough to exercise the right. */
  private static readonly EXPORTS_PER_DAY = 1;
  /** Per-section row bound, so one very large account cannot exhaust a response. */
  private static readonly EXPORT_SECTION_LIMIT = 1_000;

  private readonly passwordIdentity: PasswordIdentityProvider;

  constructor(
    private userRepo: IUserRepository = repositories.users,
    private orderRepo: IOrderRepository = repositories.orders,
    private adminRepo: IAdminRepository = repositories.admin,
    private authRepo: IAuthRepository = authRepository,
    private deliveryRepo: DeliveryRepository = repositories.delivery,
    passwordIdentity?: PasswordIdentityProvider,
    private listingRepo: IListingRepository = repositories.listings,
    private messagingRepo: IMessagingRepository = repositories.messaging,
    private reviewRepo: IReviewRepository = repositories.reviews,
    private watchRepo: IWatchSubscriptionRepository = repositories.watchSubscriptions,
    private verificationRepo: IVerificationRepository = repositories.verification,
    private notificationRepo: INotificationRepository = repositories.notifications,
  ) {
    this.passwordIdentity =
      passwordIdentity ?? createPasswordIdentityProvider(userRepo);
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    return this.userRepo.findById(id);
  }

  /** `idOrSlug` because public seller routes address profiles by either. */
  async getPublicUserById(
    idOrSlug: string,
  ): Promise<PublicSellerProfile | null> {
    return this.userRepo.findPublicById(idOrSlug);
  }

  async listPublicProfessionals(
    marketCode: string,
  ): Promise<PublicSellerProfile[]> {
    return this.userRepo.listPublicProfessionals(marketCode);
  }

  /**
   * Declares or ends an absence. `until: null` ends it now. The publications
   * paused for the absence resume when it ends, by this call or by the
   * scheduled worker once the date passes.
   */
  async setAwayMode(
    userId: string,
    input: unknown,
  ): Promise<components["schemas"]["AccountAwayState"]> {
    const parsed = accountAwayRequestSchema.safeParse(input);
    if (!parsed.success)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Indiquez une date de retour (entre demain et 90 jours) et, si vous le souhaitez, un message de 300 caractères maximum.",
      });
    if (parsed.data.until === null) {
      const { resumedPublications } = await this.userRepo.clearAway(userId);
      return { awayUntil: null, awayMessage: null, resumedPublications };
    }
    const { pausedPublications } = await this.userRepo.setAway({
      userId,
      until: parsed.data.until,
      message: parsed.data.message,
    });
    const profile = await this.userRepo.findById(userId);
    return {
      awayUntil: profile?.awayUntil ?? parsed.data.until,
      awayMessage: profile?.awayMessage ?? null,
      pausedPublications,
    };
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

  /**
   * Builds a portable copy of everything this account owns.
   *
   * Data portability is a right the account exercises itself, so this reads
   * only the requester's own records: counterparties appear as identifiers,
   * never as profiles, and nothing here widens what the caller could already
   * read through the API. Each section is bounded and reports truncation
   * rather than streaming an unbounded result set into one response.
   */
  async exportAccountData(
    userId: string,
    marketCode: string,
  ): Promise<components["schemas"]["AccountDataExport"]> {
    const limit = await this.authRepo.consumeRateLimit(
      sha256(`account_export:${userId}`),
      "account_export",
      UsersService.EXPORTS_PER_DAY,
      86_400,
      0,
    );
    if (!limit.allowed) {
      throw new AppError({
        code: "RATE_LIMITED",
        message:
          "Une copie de vos données a déjà été générée aujourd’hui. Réessayez demain.",
        details: { retryAfterSeconds: limit.retryAfterSeconds },
      });
    }

    const profile = await this.userRepo.findById(userId);
    if (!profile) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Compte introuvable.",
      });
    }

    const bound = UsersService.EXPORT_SECTION_LIMIT;
    const [
      ownedListings,
      purchases,
      sales,
      conversations,
      reviews,
      favorites,
      savedSearches,
      verification,
      preferences,
    ] = await Promise.all([
      this.listingRepo.findOwnedBySeller(userId, marketCode),
      this.orderRepo.getPurchases(userId),
      this.orderRepo.getSales(userId),
      this.messagingRepo.getUserConversations(userId, { limit: bound }),
      this.reviewRepo.getUserReviews(userId),
      this.listingRepo.getFavorites(userId, marketCode),
      this.watchRepo.list(userId, marketCode),
      this.verificationRepo.getUserStatus(userId),
      this.notificationRepo.getPreferences(userId),
    ]);

    const truncated: string[] = [];
    /*
     * Serialised the same way the transport would, so the copy the account
     * receives is exactly what the API exposes: no undefined holes, no class
     * instances, and nothing that only exists in memory.
     */
    const portable = (value: unknown): Record<string, unknown> =>
      JSON.parse(JSON.stringify(value ?? {})) as Record<string, unknown>;
    const cap = (
      section: string,
      rows: readonly unknown[],
    ): Record<string, unknown>[] => {
      if (rows.length > bound) truncated.push(section);
      return rows.slice(0, bound).map(portable);
    };

    const orders = [...purchases, ...sales].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );

    return {
      generatedAt: new Date().toISOString(),
      format: "shongre.account-export.v1",
      subject: { userId },
      profile: portable(profile),
      listings: cap("listings", ownedListings.items),
      orders: cap("orders", orders),
      conversations: cap("conversations", conversations.items),
      reviews: cap("reviews", reviews),
      favorites: favorites.slice(0, bound),
      savedSearches: cap("savedSearches", savedSearches),
      verification: [portable(verification)],
      consents: [portable(preferences)],
      ...(truncated.length > 0 ? { truncated } : {}),
    };
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
