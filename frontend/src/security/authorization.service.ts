import {
  canonicalAccessContext,
  canOperateInMarket,
  evaluateAuthorization,
  isCustomerMarketplaceCapability,
  resolveEffectiveCapabilities,
  type AccountType,
  type AuthorizationDecision,
  type AuthorizationVerificationDimension,
  type ProfessionalVertical,
} from "@shongre/contracts/access-control";
import { getCountryConfig } from "@shongre/contracts/market-country";
import type { Permission, UserProfile } from "../types";
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
  accountTypes?: readonly AccountType[];
  professionalVerticals?: readonly ProfessionalVertical[];
  requiredVerification?: readonly AuthorizationVerificationDimension[];
  featureFlag?: string;
  enabledFeatureFlags?: readonly string[];
}

class AuthorizationError extends Error {
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

class UnauthorizedError extends AuthorizationError {
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

class AccountSuspendedError extends AuthorizationError {
  constructor(
    message: string = "Votre compte est actuellement suspendu par nos équipes de modération.",
  ) {
    super(message, "ACCOUNT_SUSPENDED", 403);
  }
}

class MarketScopeForbiddenError extends AuthorizationError {
  constructor(country: string) {
    super(
      `Accès refusé : votre compte n'est pas habilité à administrer le marché ${country}.`,
      "MARKET_SCOPE_FORBIDDEN",
      403,
    );
  }
}

class ResourceOwnershipError extends AuthorizationError {
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

function authorizationResource(
  permission: Permission,
  resource: ResourceOwnershipContext,
): { ownerIds?: string[]; organizationId?: string } {
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

  return {
    ownerIds: resourceOwnerId ? [resourceOwnerId] : undefined,
    organizationId: resource.organizationId,
  };
}

class AuthorizationService {
  getEffectivePermissions(user: UserProfile | null): Permission[] {
    return user?.capabilities ?? resolveEffectiveCapabilities(user);
  }

  can(
    user: UserProfile | null,
    permission: Permission,
    resource?: ResourceOwnershipContext,
    options?: AuthorizationContextOptions,
  ): boolean {
    return this.decision(user, permission, resource, options).allowed;
  }

  decision(
    user: UserProfile | null,
    permission: Permission,
    resource?: ResourceOwnershipContext,
    options?: AuthorizationContextOptions,
  ): AuthorizationDecision {
    const targetCountry = options?.country ?? resource?.country;
    const configuredMarket = targetCountry
      ? getCountryConfig(targetCountry)
      : undefined;
    const countries = user?.marketScope?.countries?.length
      ? user.marketScope.countries
      : user?.country
        ? [user.country]
        : [];
    return evaluateAuthorization(
      {
        subject: user,
        subjectId: user?.id,
        effectiveCapabilities: user?.capabilities,
        organizationIds: resource?.authorizedOrganizationIds,
        marketCodes: countries,
        verification: {
          email: Boolean(user?.isEmailVerified),
          phone: Boolean(user?.isPhoneVerified),
          identity: Boolean(
            user?.isIdentityVerified ||
            user?.professionalVerification?.status === "verified",
          ),
          business: Boolean(
            user?.professionalVerification?.status === "verified",
          ),
          payout: user?.bankPayoutVerification?.status === "verified",
        },
        featureFlags: options?.enabledFeatureFlags,
      },
      {
        capability: permission,
        accountTypes: options?.accountTypes,
        professionalVerticals: options?.professionalVerticals,
        requiredVerification: options?.requiredVerification,
        featureFlag: options?.featureFlag,
        market: targetCountry
          ? {
              code: targetCountry,
              enabled: Boolean(
                configuredMarket?.enabled &&
                (!isCustomerMarketplaceCapability(permission) ||
                  configuredMarket.marketplace.enabled),
              ),
            }
          : undefined,
        resourceScope:
          user && resource && permission.endsWith(".own")
            ? "owner_or_organization"
            : undefined,
        resource:
          user && resource && permission.endsWith(".own")
            ? authorizationResource(permission, resource)
            : undefined,
      },
    );
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
    const decision = this.decision(user, permission, resource, options);
    if (decision.denialReason === "resource_scope") {
      throw new ResourceOwnershipError(
        "Vous ne pouvez administrer que vos propres ressources ou celles d'une organisation autorisée.",
      );
    }
    if (
      decision.denialReason === "market_scope" ||
      decision.denialReason === "market_unavailable"
    ) {
      throw new MarketScopeForbiddenError(
        options?.country ?? resource?.country ?? "inconnu",
      );
    }
    if (!decision.allowed) throw new ForbiddenError();
  }

  canAccessMarket(user: UserProfile | null, countryCode?: string): boolean {
    if (!countryCode || !user) return true;
    const countries = user.marketScope?.countries?.length
      ? user.marketScope.countries
      : user.country
        ? [user.country]
        : [];
    return canOperateInMarket(
      { subject: user, marketCodes: countries },
      { code: countryCode, enabled: true },
    );
  }
}

export const authorizationService = new AuthorizationService();
