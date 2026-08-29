import {
  canonicalAccessContext,
  resolveEffectiveCapabilities,
  type AccountType,
  type ProfessionalVertical,
} from "@shongre/contracts/access-control";
import { isProSeller } from "../domains/user/user.domain";
import type { Permission, UserProfile } from "../types";
import { PRO_PLANS, type ProPlan } from "../configuration/plans.config";
import {
  canAccessRoutePolicy,
  type RoutePolicyId,
} from "./access-policy.registry";

export interface ResourceOwnershipContext {
  ownerId?: string;
  sellerId?: string;
  buyerId?: string;
  userId?: string;
  targetUserId?: string;
  authorId?: string;
  organizationId?: string;
  authorizedOrganizationIds?: readonly string[];
  country?: string;
  status?: string;
  id?: string;
}

export interface AuthorizationContextOptions {
  country?: string;
  currentCount?: number;
  skipOwnershipCheck?: boolean;
}

export type CommercialEntitlement =
  | "storefrontCustomization"
  | "prioritySupport"
  | "bulkImportExport"
  | "automaticRelisting";

export type FeatureAvailabilityState =
  | "available"
  | "unavailable"
  | "restricted"
  | "plan_locked"
  | "verification_required"
  | "status_blocked"
  | "market_unavailable";

export interface FeatureRequirement {
  capability: Permission;
  entitlement?: CommercialEntitlement;
  accountTypes?: readonly AccountType[];
  professionalVerticals?: readonly ProfessionalVertical[];
  requiresVerification?: boolean;
  country?: string;
}

export interface FeatureAvailability {
  state: FeatureAvailabilityState;
  capability: Permission;
}

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

function resourceBelongsToUser(
  user: UserProfile,
  permission: Permission,
  resource: ResourceOwnershipContext,
): boolean {
  const resourceOwnerId =
    resource.ownerId ??
    resource.sellerId ??
    resource.buyerId ??
    resource.userId ??
    resource.targetUserId ??
    resource.authorId ??
    (resource.id &&
    (permission.startsWith("profile.") ||
      permission.startsWith("seller.profile."))
      ? resource.id
      : undefined);

  if (resourceOwnerId) return resourceOwnerId === user.id;
  if (resource.organizationId) {
    return Boolean(
      resource.authorizedOrganizationIds?.includes(resource.organizationId),
    );
  }
  // The route/component may only be checking whether the action is generally
  // available. Resource-level authorization must run once a resource exists.
  return true;
}

export class AuthorizationService {
  getEffectivePermissions(user: UserProfile | null): Permission[] {
    return resolveEffectiveCapabilities(user);
  }

  can(
    user: UserProfile | null,
    permission: Permission,
    resource?: ResourceOwnershipContext,
    options?: AuthorizationContextOptions,
  ): boolean {
    if (!this.getEffectivePermissions(user).includes(permission)) return false;

    if (
      user &&
      resource &&
      permission.endsWith(".own") &&
      !options?.skipOwnershipCheck &&
      !resourceBelongsToUser(user, permission, resource)
    ) {
      return false;
    }

    const targetCountry = options?.country ?? resource?.country;
    return !targetCountry || this.canAccessMarket(user, targetCountry);
  }

  canAccessRoute(user: UserProfile | null, policyId: RoutePolicyId): boolean {
    return canAccessRoutePolicy(user, policyId);
  }

  assertCan(
    user: UserProfile | null,
    permission: Permission,
    resource?: ResourceOwnershipContext,
    options?: AuthorizationContextOptions,
  ): void {
    if (!user && !this.getEffectivePermissions(null).includes(permission)) {
      throw new UnauthorizedError(
        "Vous devez vous connecter pour effectuer cette action.",
      );
    }

    const status = canonicalAccessContext(user).status;
    const effectivePermissions = this.getEffectivePermissions(user);
    if (status === "suspended" && !effectivePermissions.includes(permission)) {
      throw new AccountSuspendedError(
        user?.suspendedReason
          ? `Votre compte est suspendu : "${user.suspendedReason}".`
          : undefined,
      );
    }
    if (status === "banned" || status === "closed") {
      throw new ForbiddenError("Ce compte n'est plus autorisé à agir.");
    }
    if (!effectivePermissions.includes(permission)) {
      throw new ForbiddenError();
    }

    if (
      user &&
      resource &&
      permission.endsWith(".own") &&
      !options?.skipOwnershipCheck &&
      !resourceBelongsToUser(user, permission, resource)
    ) {
      throw new ResourceOwnershipError(
        "Vous ne pouvez administrer que vos propres ressources ou celles d'une organisation autorisée.",
      );
    }

    const targetCountry = options?.country ?? resource?.country;
    if (targetCountry && !this.canAccessMarket(user, targetCountry)) {
      throw new MarketScopeForbiddenError(targetCountry);
    }
  }

  canAccessMarket(user: UserProfile | null, countryCode?: string): boolean {
    if (!countryCode || !user) return true;
    const access = canonicalAccessContext(user);

    // Customer accounts browse markets; operational scope constrains staff
    // actions. Owners are the sole implicit global governance context.
    if (access.staffStatus !== "active" || access.staffRole === "owner") {
      return true;
    }

    const countries = user.marketScope?.countries?.length
      ? user.marketScope.countries
      : user.country
        ? [user.country]
        : [];
    const normalizedTarget = countryCode.toUpperCase();
    return (
      countries.includes("*") ||
      countries.some((country) => country.toUpperCase() === normalizedTarget)
    );
  }

  getUserPlan(user: UserProfile | null): ProPlan {
    const persistedPlanId =
      user?.activePlanId || (isProSeller(user) ? "pro_business" : "free");
    const planId =
      persistedPlanId === "pro_starter" || persistedPlanId === "pro_enterprise"
        ? "pro_business"
        : persistedPlanId;
    return PRO_PLANS.find((plan) => plan.id === planId) || PRO_PLANS[0];
  }

  hasEntitlement(
    user: UserProfile | null,
    entitlement: CommercialEntitlement,
  ): boolean {
    if (!user || canonicalAccessContext(user).accountType !== "professional") {
      return false;
    }
    return Boolean(this.getUserPlan(user)[entitlement]);
  }

  getFeatureAvailability(
    user: UserProfile | null,
    requirement: FeatureRequirement,
  ): FeatureAvailability {
    const access = canonicalAccessContext(user);
    if (
      requirement.accountTypes &&
      access.accountType !== "guest" &&
      !requirement.accountTypes.includes(access.accountType)
    ) {
      return { state: "unavailable", capability: requirement.capability };
    }
    if (
      requirement.professionalVerticals &&
      (!access.professionalVertical ||
        !requirement.professionalVerticals.includes(
          access.professionalVertical,
        ))
    ) {
      return { state: "unavailable", capability: requirement.capability };
    }
    if (access.status !== "active") {
      return { state: "status_blocked", capability: requirement.capability };
    }
    if (
      requirement.requiresVerification &&
      !(
        user?.isIdentityVerified ||
        user?.professionalVerification?.status === "verified"
      )
    ) {
      return {
        state: "verification_required",
        capability: requirement.capability,
      };
    }
    if (
      requirement.country &&
      !this.canAccessMarket(user, requirement.country)
    ) {
      return {
        state: "market_unavailable",
        capability: requirement.capability,
      };
    }
    if (!this.can(user, requirement.capability)) {
      return { state: "restricted", capability: requirement.capability };
    }
    if (
      requirement.entitlement &&
      !this.hasEntitlement(user, requirement.entitlement)
    ) {
      return { state: "plan_locked", capability: requirement.capability };
    }
    return { state: "available", capability: requirement.capability };
  }

  getMaxListingsQuota(user: UserProfile | null): number {
    if (!user) return 0;
    return this.getUserPlan(user).maxActiveListings;
  }

  getMaxPhotosQuota(user: UserProfile | null): number {
    if (!user) return 8;
    return this.getUserPlan(user).photosPerListing;
  }
}

export const authorizationService = new AuthorizationService();
