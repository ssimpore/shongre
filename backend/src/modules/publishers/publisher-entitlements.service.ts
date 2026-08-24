import type {
  ActiveEntitlement,
  BusinessVerticalCode,
  EffectivePublisher,
  ListingPromotionState,
  MonetizationProduct,
} from "@shongre/contracts";
import { isCommercialProductPurchasable } from "@shongre/contracts";
import { normalizeBusinessVerticalCode } from "@shongre/contracts/business-verticals";
import { resolveEffectiveEntitlementsForVertical } from "@shongre/shared";
import type { Listing, UserProfile } from "../../shared/types/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  type IListingRepository,
  type IPublisherRepository,
  type IUserRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import {
  businessRulesService,
  type BusinessRulesService,
} from "../business-rules/business-rules.service.js";

export type EntitlementReasonCode =
  | "ELIGIBLE"
  | "ACCOUNT_SUSPENDED"
  | "CATEGORY_DISABLED"
  | "MARKET_NOT_AVAILABLE"
  | "STANDARD_QUOTA_REACHED"
  | "ACTIVE_CAPACITY_REACHED"
  | "MONTHLY_PUBLICATION_QUOTA_REACHED"
  | "SUBSCRIPTION_EXPIRED"
  | "ORGANIZATION_PERMISSION_REQUIRED"
  | "ORGANIZATION_SUSPENDED"
  | "BRANCH_NOT_AVAILABLE"
  | "PROMOTION_NOT_AVAILABLE"
  | "VERIFICATION_REQUIRED"
  | "FEATURE_NOT_INCLUDED";

export interface EffectivePublisherRequest {
  actorUserId: string;
  organizationId?: string;
  branchId?: string;
}

export interface PublicationEntitlements {
  publisher: EffectivePublisher;
  eligible: boolean;
  reasonCode: EntitlementReasonCode | string;
  quotaLimit?: number;
  quotaRemaining?: number;
  monthlyPublicationLimit?: number;
  monthlyPublicationRemaining?: number;
  verticalId?: BusinessVerticalCode;
  quotaSource: "commercial_rule" | "plan_entitlement";
  durationDays?: number;
  standardPublicationAvailable: boolean;
  activeEntitlements: ActiveEntitlement[];
  entitlementSnapshot: Record<string, string | number | boolean | string[]>;
}

export interface EntitlementDecision {
  allowed: boolean;
  reasonCode: EntitlementReasonCode;
}

const PUBLISHER_ROLES = new Set(["owner", "admin", "manager", "seller"]);

const ACTIVE_CAPACITY_KEYS: Record<string, string[]> = {
  general: ["maxActiveListings"],
  auto: ["maxActiveVehicles", "maxActiveListings"],
  immo: ["maxActiveListings"],
  emploi: ["maxActiveJobs", "maxActiveListings"],
  education: ["maxActiveOffers", "maxActiveListings"],
};

function numericEntitlement(
  entitlements: Array<{ key: string; value: unknown }>,
  keys: string[],
) {
  for (const key of keys) {
    const value = entitlements.find((entry) => entry.key === key)?.value;
    if (typeof value === "number") return { key, value };
  }
  return undefined;
}

function publicationFailureReason(reasonCode: string): EntitlementReasonCode {
  if (
    reasonCode === "STANDARD_QUOTA_REACHED" ||
    reasonCode === "ACTIVE_CAPACITY_REACHED" ||
    reasonCode === "MONTHLY_PUBLICATION_QUOTA_REACHED" ||
    reasonCode === "MARKET_NOT_AVAILABLE" ||
    reasonCode === "CATEGORY_DISABLED"
  ) {
    return reasonCode;
  }
  return "CATEGORY_DISABLED";
}

function verificationStatus(
  user: UserProfile,
  professional: boolean,
): EffectivePublisher["verificationStatus"] {
  if (user.status === "suspended") return "suspended";
  if (professional && user.isBusinessVerified) return "business_verified";
  if (user.isIdentityVerified) return "identity_verified";
  if (user.isPhoneVerified) return "phone_verified";
  if (user.isEmailVerified) return "email_verified";
  return "unverified";
}

function failure(reasonCode: EntitlementReasonCode, message: string): never {
  throw new AppError({
    code:
      reasonCode === "ACCOUNT_SUSPENDED" ||
      reasonCode === "ORGANIZATION_PERMISSION_REQUIRED"
        ? "FORBIDDEN"
        : "CONFLICT",
    message,
    details: { reasonCode },
  });
}

/** Backend-authoritative resolver for every publisher and publication right. */
export class PublisherEntitlementsService {
  constructor(
    private readonly users: IUserRepository = repositories.users,
    private readonly publishers: IPublisherRepository = repositories.publishers,
    private readonly listings: IListingRepository = repositories.listings,
    private readonly rules: BusinessRulesService = businessRulesService,
  ) {}

  async getEffectivePublisher(
    request: EffectivePublisherRequest,
  ): Promise<EffectivePublisher> {
    const user = await this.users.findById(request.actorUserId);
    if (!user)
      failure(
        "ORGANIZATION_PERMISSION_REQUIRED",
        "Compte de publication introuvable.",
      );
    if (user.status !== "active") {
      failure(
        "ACCOUNT_SUSPENDED",
        "Ce compte ne peut pas publier actuellement.",
      );
    }

    const organization = request.organizationId
      ? await this.publishers.findOrganization(request.organizationId)
      : user.accountType === "professional"
        ? await this.publishers.findDefaultOrganization(user.id)
        : null;
    if (!organization) {
      if (request.organizationId || request.branchId) {
        failure(
          "ORGANIZATION_PERMISSION_REQUIRED",
          "Organisation de publication non autorisée.",
        );
      }
      return {
        type: "private",
        userId: user.id,
        displayName: user.name,
        avatarUrl: user.avatarUrl,
        verificationStatus: verificationStatus(user, false),
      };
    }
    if (organization.status !== "active") {
      failure(
        "ORGANIZATION_SUSPENDED",
        "Cette organisation ne peut pas publier actuellement.",
      );
    }
    const membership = await this.publishers.findMembership(
      organization.id,
      user.id,
    );
    if (
      !membership ||
      membership.status !== "active" ||
      !PUBLISHER_ROLES.has(membership.role)
    ) {
      failure(
        "ORGANIZATION_PERMISSION_REQUIRED",
        "Vous ne pouvez pas publier pour cette organisation.",
      );
    }
    if (request.branchId) {
      const branch = await this.publishers.findBranch(request.branchId);
      const branchAllowed =
        branch?.organizationId === organization.id &&
        branch.status === "active" &&
        (membership.role === "owner" ||
          membership.role === "admin" ||
          membership.branchIds.includes(branch.id));
      if (!branchAllowed) {
        failure(
          "BRANCH_NOT_AVAILABLE",
          "Établissement de publication non autorisé.",
        );
      }
    }
    return {
      type: "professional",
      userId: user.id,
      organizationId: organization.id,
      branchId: request.branchId,
      displayName: organization.displayName,
      avatarUrl: user.avatarUrl,
      verificationStatus: organization.isVerified
        ? "business_verified"
        : verificationStatus(user, true),
    };
  }

  private async policyAccountId(
    publisher: EffectivePublisher,
  ): Promise<string> {
    if (!publisher.organizationId) return publisher.userId;
    const organization = await this.publishers.findOrganization(
      publisher.organizationId,
    );
    return organization?.ownerUserId || publisher.userId;
  }

  async getPublicationEntitlements(input: {
    actorUserId: string;
    organizationId?: string;
    branchId?: string;
    marketCode: string;
    categoryId: string;
  }): Promise<PublicationEntitlements> {
    const publisher = await this.getEffectivePublisher(input);
    const accountId = await this.policyAccountId(publisher);
    const ownerFilter = publisher.organizationId
      ? {
          publisherOrganizationId: publisher.organizationId,
          marketCode: input.marketCode,
          limit: 1,
        }
      : { sellerId: publisher.userId, marketCode: input.marketCode, limit: 1 };
    const [all, category, activeEntitlements, catalog] = await Promise.all([
      this.listings.search(ownerFilter),
      this.listings.search({ ...ownerFilter, categoryId: input.categoryId }),
      this.rules.getActiveEntitlements(accountId),
      this.rules.getCatalog(input.marketCode.toUpperCase()),
    ]);
    const preview = await this.rules.getAccountEligibility(
      accountId,
      {
        marketCode: input.marketCode.toUpperCase(),
        countryCode: input.marketCode.toUpperCase(),
        currency: input.marketCode.toUpperCase() === "CH" ? "CHF" : "EUR",
        categoryId: input.categoryId,
        userType:
          publisher.type === "professional" ? "professional" : "individual",
        listingType: "standard",
        publicationChannel: "web",
        usageLevel: 0,
        featureFlags: [],
      },
      { total: all.total, category: category.total },
    );
    const configuredVertical = catalog.verticals.find((vertical) =>
      vertical.categoryIds.includes(input.categoryId),
    );
    const verticalId = configuredVertical?.id || "general";
    const effectiveEntitlements = resolveEffectiveEntitlementsForVertical({
      catalog,
      entitlements: activeEntitlements,
      verticalId,
    });
    const canonicalVerticalId = normalizeBusinessVerticalCode(verticalId);
    const capacity = numericEntitlement(
      effectiveEntitlements,
      ACTIVE_CAPACITY_KEYS[canonicalVerticalId] || ["maxActiveListings"],
    );
    const monthly = numericEntitlement(effectiveEntitlements, [
      "maxMonthlyPublications",
    ]);
    const capacityUsed = verticalId === "general" ? all.total : category.total;
    const quotaRemaining = capacity
      ? Math.max(0, capacity.value - capacityUsed)
      : preview.quotaRemaining;
    const monthlyUsage = monthly
      ? await this.rules.getEntitlementQuotaUsage(accountId, {
          entitlementKey: monthly.key,
          verticalId,
          marketCode: input.marketCode,
        })
      : undefined;
    const monthlyRemaining = monthly
      ? Math.max(0, monthly.value - (monthlyUsage?.used || 0))
      : undefined;
    const verticalEnabled =
      !configuredVertical || configuredVertical.status === "active";
    const planCanReplaceRuleQuota =
      Boolean(capacity) && preview.reasonCode === "QUOTA_EXHAUSTED";
    const underlyingEligible = preview.eligible || planCanReplaceRuleQuota;
    const eligible =
      verticalEnabled &&
      underlyingEligible &&
      (quotaRemaining === undefined || quotaRemaining > 0) &&
      (monthlyRemaining === undefined || monthlyRemaining > 0);
    const reasonCode = !verticalEnabled
      ? "CATEGORY_DISABLED"
      : quotaRemaining !== undefined && quotaRemaining <= 0
        ? "ACTIVE_CAPACITY_REACHED"
        : monthlyRemaining !== undefined && monthlyRemaining <= 0
          ? "MONTHLY_PUBLICATION_QUOTA_REACHED"
          : underlyingEligible
            ? "ELIGIBLE"
            : preview.reasonCode;
    const entitlementSnapshot = Object.fromEntries(
      effectiveEntitlements.map((entry) => [entry.key, entry.value]),
    );
    return {
      publisher,
      eligible,
      reasonCode,
      quotaLimit: capacity?.value ?? preview.quotaLimit,
      quotaRemaining,
      monthlyPublicationLimit: monthly?.value,
      monthlyPublicationRemaining: monthlyRemaining,
      verticalId,
      quotaSource: capacity ? "plan_entitlement" : "commercial_rule",
      durationDays: preview.durationDays,
      standardPublicationAvailable: eligible,
      activeEntitlements,
      entitlementSnapshot,
    };
  }

  async authorizePublication(input: {
    actorUserId: string;
    organizationId?: string;
    branchId?: string;
    marketCode: string;
    categoryId: string;
  }): Promise<PublicationEntitlements> {
    const entitlements = await this.getPublicationEntitlements(input);
    if (!entitlements.eligible) {
      failure(
        publicationFailureReason(entitlements.reasonCode),
        "La publication standard n’est pas disponible dans ce contexte.",
      );
    }
    const accountId = await this.policyAccountId(entitlements.publisher);
    if (
      entitlements.quotaSource === "plan_entitlement" &&
      typeof entitlements.monthlyPublicationLimit === "number"
    ) {
      const used = await this.rules.consumeEntitlementQuota(accountId, {
        entitlementKey: "maxMonthlyPublications",
        verticalId: entitlements.verticalId || "general",
        marketCode: input.marketCode,
        limit: entitlements.monthlyPublicationLimit,
      });
      return {
        ...entitlements,
        monthlyPublicationRemaining: Math.max(
          0,
          entitlements.monthlyPublicationLimit - used,
        ),
      };
    }
    if (entitlements.quotaSource === "plan_entitlement") {
      return entitlements;
    }
    const ownerFilter = entitlements.publisher.organizationId
      ? {
          publisherOrganizationId: entitlements.publisher.organizationId,
          marketCode: input.marketCode,
          limit: 1,
        }
      : { sellerId: accountId, marketCode: input.marketCode, limit: 1 };
    const [all, category] = await Promise.all([
      this.listings.search(ownerFilter),
      this.listings.search({
        ...ownerFilter,
        categoryId: input.categoryId,
      }),
    ]);
    const result = await this.rules.authorizePublication(
      accountId,
      {
        marketCode: input.marketCode.toUpperCase(),
        countryCode: input.marketCode.toUpperCase(),
        currency: input.marketCode.toUpperCase() === "CH" ? "CHF" : "EUR",
        categoryId: input.categoryId,
        userType:
          entitlements.publisher.type === "professional"
            ? "professional"
            : "individual",
        listingType: "standard",
        publicationChannel: "web",
        usageLevel: 0,
        featureFlags: [],
      },
      { total: all.total, category: category.total },
    );
    return {
      ...entitlements,
      quotaRemaining: result.quotaRemaining,
      durationDays: result.durationDays,
    };
  }

  async canCreateStandardListing(input: {
    actorUserId: string;
    organizationId?: string;
    branchId?: string;
    marketCode: string;
    categoryId: string;
  }): Promise<EntitlementDecision> {
    const result = await this.getPublicationEntitlements(input);
    return {
      allowed: result.standardPublicationAvailable,
      reasonCode: result.standardPublicationAvailable
        ? "ELIGIBLE"
        : (result.reasonCode as EntitlementReasonCode),
    };
  }

  async canPublishInCategory(
    input: Parameters<
      PublisherEntitlementsService["canCreateStandardListing"]
    >[0],
  ): Promise<EntitlementDecision> {
    return this.canCreateStandardListing(input);
  }

  async canPublishForOrganization(
    input: EffectivePublisherRequest,
  ): Promise<EntitlementDecision> {
    try {
      const publisher = await this.getEffectivePublisher(input);
      return publisher.type === "professional"
        ? { allowed: true, reasonCode: "ELIGIBLE" }
        : { allowed: false, reasonCode: "ORGANIZATION_PERMISSION_REQUIRED" };
    } catch (error) {
      const reasonCode =
        error instanceof AppError &&
        typeof error.details?.reasonCode === "string"
          ? (error.details.reasonCode as EntitlementReasonCode)
          : "ORGANIZATION_PERMISSION_REQUIRED";
      return { allowed: false, reasonCode };
    }
  }

  async getRemainingListingQuota(input: {
    actorUserId: string;
    organizationId?: string;
    branchId?: string;
    marketCode: string;
    categoryId: string;
  }): Promise<{
    remaining?: number;
    limit?: number;
    reasonCode: EntitlementReasonCode | string;
  }> {
    const result = await this.getPublicationEntitlements(input);
    return {
      remaining: result.quotaRemaining,
      limit: result.quotaLimit,
      reasonCode: result.reasonCode,
    };
  }

  async canPurchasePromotion(
    actorUserId: string,
    listing: Listing,
    product: MonetizationProduct,
  ): Promise<EntitlementDecision> {
    if (!(await this.canManageListing(actorUserId, listing))) {
      return { allowed: false, reasonCode: "ORGANIZATION_PERMISSION_REQUIRED" };
    }
    if (
      listing.status !== "published" ||
      !isCommercialProductPurchasable(product)
    ) {
      return { allowed: false, reasonCode: "PROMOTION_NOT_AVAILABLE" };
    }
    if (
      !["premium_option", "sponsored_placement", "pack"].includes(product.kind)
    ) {
      return { allowed: false, reasonCode: "PROMOTION_NOT_AVAILABLE" };
    }
    const publisherAudience =
      listing.publisherType === "professional" ||
      Boolean(listing.publisherOrganizationId) ||
      listing.seller?.accountType === "professional"
        ? "professional"
        : "individual";
    const eligibleAudience =
      product.audience === "all" ||
      product.audience === publisherAudience ||
      (product.audience === "organization" &&
        publisherAudience === "professional");
    const marketAllowed =
      !product.scope.marketCodes.length ||
      product.scope.marketCodes.includes(listing.marketCode);
    const categoryAllowed =
      !product.scope.categoryIds.length ||
      product.scope.categoryIds.includes(listing.categoryId);
    return eligibleAudience && marketAllowed && categoryAllowed
      ? { allowed: true, reasonCode: "ELIGIBLE" }
      : { allowed: false, reasonCode: "PROMOTION_NOT_AVAILABLE" };
  }

  getEffectivePromotionState(
    listing: Listing,
    now = new Date(),
  ): ListingPromotionState {
    const startsInFuture =
      Boolean(listing.promotionStartAt) &&
      new Date(listing.promotionStartAt!) > now;
    const hasExpired =
      Boolean(listing.promotionEndAt) &&
      new Date(listing.promotionEndAt!) <= now;
    const active =
      listing.promotionState === "active" &&
      Boolean(
        listing.promotionType &&
        listing.promotionSource &&
        listing.promotionSourceId,
      ) &&
      !startsInFuture &&
      !hasExpired;
    const state = active
      ? "active"
      : hasExpired
        ? "expired"
        : startsInFuture
          ? "scheduled"
          : listing.promotionState || "inactive";
    return {
      state,
      type: active ? listing.promotionType : undefined,
      label: active ? listing.promotionLabel : undefined,
      source: active ? listing.promotionSource : undefined,
      sourceId: active ? listing.promotionSourceId : undefined,
      startsAt: listing.promotionStartAt,
      endsAt: listing.promotionEndAt,
      promotedAt: listing.promotedAt,
    };
  }

  async canImportInventory(actorUserId: string, organizationId?: string) {
    return this.canUseProfessionalFeature(
      actorUserId,
      "bulkImportExport",
      organizationId,
    );
  }

  async canManageListing(
    actorUserId: string,
    listing: Listing,
  ): Promise<boolean> {
    if ((listing.publisherUserId || listing.sellerId) === actorUserId)
      return true;
    if (!listing.publisherOrganizationId) return false;
    const membership = await this.publishers.findMembership(
      listing.publisherOrganizationId,
      actorUserId,
    );
    return Boolean(
      membership &&
      membership.status === "active" &&
      PUBLISHER_ROLES.has(membership.role) &&
      (!listing.publisherBranchId ||
        membership.role === "owner" ||
        membership.role === "admin" ||
        membership.branchIds.includes(listing.publisherBranchId)),
    );
  }

  async canUseProfessionalFeature(
    actorUserId: string,
    featureKey: string,
    organizationId?: string,
  ): Promise<{ allowed: boolean; reasonCode: EntitlementReasonCode }> {
    const publisher = await this.getEffectivePublisher({
      actorUserId,
      organizationId,
    });
    if (publisher.type !== "professional") {
      return { allowed: false, reasonCode: "ORGANIZATION_PERMISSION_REQUIRED" };
    }
    const accountId = await this.policyAccountId(publisher);
    const active = await this.rules.getActiveEntitlements(accountId);
    const entitlement = active.find((entry) => entry.key === featureKey);
    return entitlement && entitlement.value !== false && entitlement.value !== 0
      ? { allowed: true, reasonCode: "ELIGIBLE" }
      : { allowed: false, reasonCode: "FEATURE_NOT_INCLUDED" };
  }
}

export const publisherEntitlementsService = new PublisherEntitlementsService();
