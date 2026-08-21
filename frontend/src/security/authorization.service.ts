import { isProSeller } from "../domains/user/user.domain";
import { UserProfile, Permission } from "../types";
import { ROLE_DEFINITIONS, normalizePlatformRole } from "./roles.config";
import { PRO_PLANS, ProPlan } from "../configuration/plans.config";

export interface ResourceOwnershipContext {
  ownerId?: string;
  sellerId?: string;
  buyerId?: string;
  userId?: string;
  targetUserId?: string;
  authorId?: string;
  country?: string;
  status?: string;
}

export interface AuthorizationContextOptions {
  country?: string;
  currentCount?: number;
  skipOwnershipCheck?: boolean;
}

// Custom Typed Errors
export class AuthorizationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(
    message: string,
    code: string = "AUTH_FORBIDDEN",
    statusCode: number = 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class UnauthorizedError extends AuthorizationError {
  constructor(
    message: string = "Connexion requise pour effectuer cette action.",
  ) {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AuthorizationError {
  constructor(
    message: string = "Vous ne disposez pas des autorisations nécessaires pour réaliser cette action.",
  ) {
    super(message, "FORBIDDEN", 403);
  }
}

export class AccountSuspendedError extends AuthorizationError {
  constructor(
    message: string = "Votre compte est actuellement suspendu par nos équipes de modération.",
  ) {
    super(message, "ACCOUNT_SUSPENDED", 403);
  }
}

export class MarketScopeForbiddenError extends AuthorizationError {
  constructor(country: string) {
    super(
      `Accès refusé : votre compte n'est pas habilité à administrer le marché ${country}.`,
      "MARKET_SCOPE_FORBIDDEN",
      403,
    );
  }
}

export class ResourceOwnershipError extends AuthorizationError {
  constructor(
    message: string = "Vous n'êtes pas propriétaire de cette ressource.",
  ) {
    super(message, "RESOURCE_OWNERSHIP_DENIED", 403);
  }
}

export class EntitlementLimitError extends AuthorizationError {
  constructor(
    message: string = "La limite autorisée par votre forfait a été atteinte.",
  ) {
    super(message, "ENTITLEMENT_LIMIT_REACHED", 403);
  }
}

export class AuthorizationService {
  /**
   * Calculate effective permissions granted to a user.
   */
  getEffectivePermissions(user: UserProfile | null): Permission[] {
    if (!user) {
      return [...ROLE_DEFINITIONS.guest.defaultPermissions];
    }

    const primaryRole = user.primaryRole || normalizePlatformRole(user.role);
    const roleMeta = ROLE_DEFINITIONS[primaryRole] || ROLE_DEFINITIONS.buyer;

    // Collect base permissions from primary role
    const permissionSet = new Set<Permission>(roleMeta.defaultPermissions);

    // Merge permissions from additional assigned roles (if any)
    if (user.roles && Array.isArray(user.roles)) {
      for (const r of user.roles) {
        const extraMeta = ROLE_DEFINITIONS[r];
        if (extraMeta) {
          extraMeta.defaultPermissions.forEach((p) => permissionSet.add(p));
        }
      }
    }

    // Add direct custom permission grants
    if (user.customPermissions && Array.isArray(user.customPermissions)) {
      user.customPermissions.forEach((p) => permissionSet.add(p));
    }

    // Remove explicitly revoked permissions
    if (user.revokedPermissions && Array.isArray(user.revokedPermissions)) {
      user.revokedPermissions.forEach((p) => permissionSet.delete(p));
    }

    return Array.from(permissionSet);
  }

  /**
   * Evaluates whether a user can perform an action on a resource.
   */
  can(
    user: UserProfile | null,
    permission: Permission,
    resource?: ResourceOwnershipContext | any,
    options?: AuthorizationContextOptions,
  ): boolean {
    // 1. Guest Checks
    if (!user) {
      const guestPerms = ROLE_DEFINITIONS.guest.defaultPermissions;
      return guestPerms.includes(permission);
    }

    // 2. Account Lifecycle Status Checks
    const isSuspended = user.isSuspended || user.status === "suspended";
    const isDeactivated =
      user.isDeactivated ||
      user.status === "disabled" ||
      user.status === "deleted";

    if (isDeactivated) {
      return false;
    }

    if (isSuspended) {
      // Suspended users can ONLY read basic profile, own conversations and file reports
      const allowedWhileSuspended: Permission[] = [
        "profile.read",
        "message.read.own",
        "order.read.own",
        "report.create",
      ];
      if (!allowedWhileSuspended.includes(permission)) {
        return false;
      }
    }

    const effectivePermissions = this.getEffectivePermissions(user);

    // 3. Permission existence check
    if (!effectivePermissions.includes(permission)) {
      return false;
    }

    // 4. Resource Ownership Verification (for .own permissions)
    if (resource && !options?.skipOwnershipCheck) {
      const isSuperAdmin =
        user.primaryRole === "super_admin" || user.role === "super_admin";
      const isAdmin = user.primaryRole === "admin" || user.role === "admin";

      if (permission.endsWith(".own") && !isSuperAdmin && !isAdmin) {
        const resourceOwnerId =
          resource.ownerId ||
          resource.sellerId ||
          resource.buyerId ||
          resource.userId ||
          resource.authorId ||
          (resource.id &&
          (permission.startsWith("profile.") ||
            permission.startsWith("seller.profile."))
            ? resource.id
            : undefined);

        if (resourceOwnerId && resourceOwnerId !== user.id) {
          return false;
        }
      }
    }

    // 5. Market Scoping Verification (for internal staff managing localized markets)
    const targetCountry = options?.country || resource?.country;
    if (targetCountry && !this.canAccessMarket(user, targetCountry)) {
      return false;
    }

    return true;
  }

  /**
   * Asserts that a user can perform an action, throwing a specific AuthorizationError if denied.
   */
  assertCan(
    user: UserProfile | null,
    permission: Permission,
    resource?: ResourceOwnershipContext | any,
    options?: AuthorizationContextOptions,
  ): void {
    if (!user) {
      const guestPerms = ROLE_DEFINITIONS.guest.defaultPermissions;
      if (!guestPerms.includes(permission)) {
        throw new UnauthorizedError(
          "Vous devez vous connecter pour effectuer cette action.",
        );
      }
      return;
    }

    if (
      user.isDeactivated ||
      user.status === "disabled" ||
      user.status === "deleted"
    ) {
      throw new ForbiddenError("Ce compte a été désactivé.");
    }

    if (user.isSuspended || user.status === "suspended") {
      const allowedWhileSuspended: Permission[] = [
        "profile.read",
        "message.read.own",
        "order.read.own",
        "report.create",
      ];
      if (!allowedWhileSuspended.includes(permission)) {
        throw new AccountSuspendedError(
          user.suspendedReason
            ? `Votre compte est suspendu pour le motif suivant : "${user.suspendedReason}".`
            : "Votre compte est suspendu pour des raisons de conformité et de sécurité.",
        );
      }
    }

    const effectivePermissions = this.getEffectivePermissions(user);
    if (!effectivePermissions.includes(permission)) {
      throw new ForbiddenError(
        `Action non autorisée : permission manquante [${permission}].`,
      );
    }

    if (resource && !options?.skipOwnershipCheck) {
      const isSuperAdmin =
        user.primaryRole === "super_admin" || user.role === "super_admin";
      const isAdmin = user.primaryRole === "admin" || user.role === "admin";

      if (permission.endsWith(".own") && !isSuperAdmin && !isAdmin) {
        const resourceOwnerId =
          resource.ownerId ||
          resource.sellerId ||
          resource.buyerId ||
          resource.userId ||
          resource.authorId ||
          (resource.id &&
          (permission.startsWith("profile.") ||
            permission.startsWith("seller.profile."))
            ? resource.id
            : undefined);

        if (resourceOwnerId && resourceOwnerId !== user.id) {
          throw new ResourceOwnershipError(
            "Vous ne pouvez modifier ou administrer que vos propres ressources.",
          );
        }
      }
    }

    const targetCountry = options?.country || resource?.country;
    if (targetCountry && !this.canAccessMarket(user, targetCountry)) {
      throw new MarketScopeForbiddenError(targetCountry);
    }
  }

  /**
   * Verifies market access for staff with geographical scopes.
   */
  canAccessMarket(user: UserProfile | null, countryCode?: string): boolean {
    if (!countryCode) return true;
    if (!user) return true; // public visitors can browse all markets

    // Super admins and platform admins have global scope
    const role = user.primaryRole || normalizePlatformRole(user.role);
    if (role === "super_admin" || role === "admin") {
      return true;
    }

    // If user has no market scope defined, default to full access
    if (
      !user.marketScope ||
      !user.marketScope.countries ||
      user.marketScope.countries.length === 0
    ) {
      return true;
    }

    const normalizedTarget = countryCode.toUpperCase();
    return (
      user.marketScope.countries.includes("*") ||
      user.marketScope.countries
        .map((c) => c.toUpperCase())
        .includes(normalizedTarget)
    );
  }

  /**
   * Checks plan entitlements (e.g. max active listings, photos per listing, analytics, bulk import).
   */
  getUserPlan(user: UserProfile | null): ProPlan {
    const planId =
      user?.activePlanId || (isProSeller(user) ? "pro_starter" : "free");
    return PRO_PLANS.find((p) => p.id === planId) || PRO_PLANS[0];
  }

  hasEntitlement(
    user: UserProfile | null,
    entitlement:
      | "storefrontCustomization"
      | "prioritySupport"
      | "bulkImportExport"
      | "automaticRelisting",
  ): boolean {
    if (!user) return false;
    // Admins have all entitlements
    const role = user.primaryRole || normalizePlatformRole(user.role);
    if (role === "admin" || role === "super_admin") return true;

    const plan = this.getUserPlan(user);
    return Boolean(plan[entitlement]);
  }

  getMaxListingsQuota(user: UserProfile | null): number {
    if (!user) return 0;
    const plan = this.getUserPlan(user);
    return plan.maxActiveListings;
  }

  getMaxPhotosQuota(user: UserProfile | null): number {
    if (!user) return 8;
    const plan = this.getUserPlan(user);
    return plan.photosPerListing;
  }
}

export const authorizationService = new AuthorizationService();
