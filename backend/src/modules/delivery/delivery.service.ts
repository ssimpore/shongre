import {
  DELIVERY_FEATURE_FLAG_KEY,
  DELIVERY_TAXONOMY_CATEGORY_ID,
  canTransitionDeliveryRequestForParticipant,
  deliveryAcceptApplicationInputSchema,
  deliveryApplicationInputSchema,
  deliveryAssignmentTransitionInputSchema,
  deliveryCourierProfileInputSchema,
  deliveryModerationSuspendInputSchema,
  deliveryRequestDraftInputSchema,
  deliverySearchInputSchema,
  type DeliveryPrivateRequest,
  type DeliverySelectedCourierAssignment,
  type DeliveryPublicRequest,
} from "@shongre/contracts/delivery";
import type { MarketContext } from "@shongre/contracts";
import type {
  DeliveryApplicationRecord,
  DeliveryRepository,
  DeliveryRequestRecord,
} from "../../infrastructure/database/repositories/delivery.repository.js";
import { repositories } from "../../infrastructure/database/repositories/repository-container.js";
import { logger } from "../../infrastructure/logging/logger.js";
import type { Principal } from "../../shared/auth/principal.js";
import {
  requireAuthenticated,
  requireAuthorization,
} from "../../shared/auth/principal.js";
import { AppError, type ErrorCode } from "../../shared/errors/app-error.js";
import {
  FeatureFlagService,
  featureFlagService,
} from "../feature-flags/feature-flag.service.js";
import { OrdersService, ordersService } from "../orders/orders.service.js";
import {
  AnalyticsService,
  analyticsService,
} from "../analytics/analytics.service.js";
import {
  TaxonomyV4Service,
  taxonomyV4Service,
} from "../taxonomy/taxonomy.v4.service.js";

const DELIVERY_ERROR_CODES = new Set<ErrorCode>([
  "DELIVERY_FEATURE_UNAVAILABLE",
  "DELIVERY_MARKET_MISMATCH",
  "DELIVERY_REQUEST_NOT_OPEN",
  "DELIVERY_REQUEST_EXPIRED",
  "DELIVERY_APPLICATION_EXISTS",
  "DELIVERY_APPLICATION_CONFLICT",
  "DELIVERY_NOT_ELIGIBLE",
  "DELIVERY_ASSIGNMENT_CONFLICT",
]);

function deliveryError(error: unknown, fallback: ErrorCode): never {
  if (error instanceof AppError) throw error;
  const message = error instanceof Error ? error.message : "";
  const code = DELIVERY_ERROR_CODES.has(message as ErrorCode)
    ? (message as ErrorCode)
    : fallback;
  throw new AppError({
    code,
    message:
      code === "DELIVERY_FEATURE_UNAVAILABLE"
        ? "La livraison entre membres n’est pas disponible sur ce marché."
        : code === "DELIVERY_NOT_ELIGIBLE" ||
            code === "DELIVERY_MARKET_MISMATCH"
          ? "Cette demande de livraison n’est pas accessible."
          : "La demande de livraison a changé. Actualisez puis réessayez.",
  });
}

function publicRequest(request: DeliveryRequestRecord): DeliveryPublicRequest {
  const {
    sourceOrderId: _sourceOrderId,
    pickup: _pickup,
    dropoff: _dropoff,
    applications: _applications,
    selectedApplicationId: _selectedApplicationId,
    requesterId: _requesterId,
    idempotencyKey: _idempotencyKey,
    ...projection
  } = request;
  return projection;
}

function selectedCourierAssignment(
  request: DeliveryRequestRecord,
  selected: DeliveryApplicationRecord,
): DeliverySelectedCourierAssignment {
  const {
    courierUserId: _courierUserId,
    courierProfileId: _courierProfileId,
    ...selectedApplication
  } = selected;
  return {
    ...publicRequest(request),
    pickup: request.pickup,
    dropoff: request.dropoff,
    selectedApplicationId: selected.id,
    selectedApplication,
  };
}

function principalDisplayName(principal: Principal): string {
  return principal.email.split("@")[0] || "Membre Shongre";
}

export class DeliveryService {
  constructor(
    private readonly repository: DeliveryRepository = repositories.delivery,
    private readonly flags: FeatureFlagService = featureFlagService,
    private readonly taxonomy: TaxonomyV4Service = taxonomyV4Service,
    private readonly orders: OrdersService = ordersService,
    private readonly analytics: AnalyticsService = analyticsService,
  ) {}

  async availability(principal: Principal, context: MarketContext) {
    const country = context.country;
    const reasons: Array<
      | "country_disabled"
      | "marketplace_disabled"
      | "delivery_capability_disabled"
      | "taxonomy_unavailable"
      | "feature_flag_disabled"
      | "operational_readiness_incomplete"
    > = [];
    if (!country?.enabled || !["active", "beta"].includes(country.launchStatus))
      reasons.push("country_disabled");
    if (!country?.marketplace.enabled) reasons.push("marketplace_disabled");
    if (!country?.capabilities.delivery)
      reasons.push("delivery_capability_disabled");
    if (
      !country ||
      !country.readiness.operations ||
      !country.readiness.legal ||
      !country.readiness.compliance ||
      (country.compliance.legalReviewRequired &&
        country.compliance.legalReviewStatus !== "approved")
    ) {
      reasons.push("operational_readiness_incomplete");
    }
    try {
      if (country) {
        this.taxonomy.resolve({
          marketContext: context,
          categoryIdentity: DELIVERY_TAXONOMY_CATEGORY_ID,
          intent: "SERVICE_REQUEST",
          sellerType: "individual",
          locale: context.locale || country.defaultLocale,
        });
      } else {
        reasons.push("taxonomy_unavailable");
      }
    } catch {
      reasons.push("taxonomy_unavailable");
    }
    const flag = await this.flags.evaluatePublic(
      principal,
      DELIVERY_FEATURE_FLAG_KEY,
      { marketCode: context.countryCode || undefined },
    );
    if (!flag.enabled) reasons.push("feature_flag_disabled");
    return {
      marketCode: context.countryCode || "ZZ",
      enabled: reasons.length === 0,
      readOnlyAssigned: reasons.length > 0,
      reasons: [...new Set(reasons)],
    };
  }

  async getCourierProfile(principal: Principal, context: MarketContext) {
    this.requireCapability(principal, "delivery.courier.manage.own", context);
    return this.repository.getCourierProfile(
      principal.userId,
      this.requireMarket(context),
    );
  }

  async saveCourierProfile(
    principal: Principal,
    context: MarketContext,
    input: unknown,
  ) {
    await this.requireEnabled(principal, context);
    this.requireCapability(principal, "delivery.courier.manage.own", context);
    const value = deliveryCourierProfileInputSchema.parse(input);
    return this.repository.saveCourierProfile(
      principal.userId,
      this.requireMarket(context),
      value,
    );
  }

  async createDraft(
    principal: Principal,
    context: MarketContext,
    input: unknown,
  ) {
    await this.requireEnabled(principal, context);
    this.requireCapability(principal, "delivery.request.manage.own", context);
    const value = deliveryRequestDraftInputSchema.parse(input);
    const marketCode = this.requireMarket(context);
    if (value.marketCode !== marketCode)
      throw new AppError({
        code: "DELIVERY_MARKET_MISMATCH",
        message: "Le marché de la demande ne correspond pas au site utilisé.",
      });
    if (value.expiresAt <= new Date().toISOString())
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La date d’expiration doit être future.",
      });
    if (value.origin === "order") {
      await this.assertEligibleOrder(
        principal,
        value.sourceOrderId,
        marketCode,
      );
    }
    try {
      const request = await this.repository.createDraft(
        principal.userId,
        principalDisplayName(principal),
        false,
        value,
      );
      this.captureEvent(
        "delivery_request_started",
        request,
        principal,
        `evt_delivery_request_started_${request.id}`,
      );
      return request;
    } catch (error) {
      deliveryError(error, "DELIVERY_APPLICATION_CONFLICT");
    }
  }

  async publish(
    principal: Principal,
    context: MarketContext,
    requestId: string,
  ) {
    await this.requireEnabled(principal, context);
    this.requireCapability(principal, "delivery.request.manage.own", context);
    try {
      const existing = await this.requireRequest(requestId);
      this.assertSameMarket(existing, context);
      const request = await this.repository.publish(
        requestId,
        principal.userId,
      );
      this.captureEvent(
        "delivery_request_published",
        request,
        principal,
        `evt_delivery_request_published_${request.id}_${request.version}`,
      );
      return request;
    } catch (error) {
      deliveryError(error, "DELIVERY_REQUEST_NOT_OPEN");
    }
  }

  async search(principal: Principal, context: MarketContext, input: unknown) {
    await this.requireEnabled(principal, context);
    const query = deliverySearchInputSchema.parse(input);
    if (query.marketCode !== this.requireMarket(context))
      throw new AppError({
        code: "DELIVERY_MARKET_MISMATCH",
        message: "Le marché de recherche ne correspond pas au site utilisé.",
      });
    return this.repository.searchPublic(query);
  }

  async getPublicRequest(
    principal: Principal,
    context: MarketContext,
    requestId: string,
  ) {
    await this.requireEnabled(principal, context);
    const request = await this.requireRequest(requestId);
    this.assertSameMarket(request, context);
    if (
      request.status !== "open" ||
      request.expiresAt <= new Date().toISOString()
    )
      throw new AppError({
        code: "NOT_FOUND",
        message: "Demande introuvable.",
      });
    return publicRequest(request);
  }

  async getFavoriteRequestIds(principal: Principal, context: MarketContext) {
    this.requireFavoriteCapability(principal, context);
    return this.repository.getFavoriteRequestIds(
      principal.userId,
      this.requireMarket(context),
    );
  }

  async getFavoritePublicRequests(
    principal: Principal,
    context: MarketContext,
  ) {
    this.requireFavoriteCapability(principal, context);
    const availability = await this.availability(principal, context);
    if (!availability.enabled) return [];
    const marketCode = this.requireMarket(context);
    const requestIds = await this.repository.getFavoriteRequestIds(
      principal.userId,
      marketCode,
    );
    return this.repository.getPublicRequestsByIds(requestIds, marketCode);
  }

  async setFavoriteRequest(
    principal: Principal,
    context: MarketContext,
    requestId: string,
    isFavorite: boolean,
  ) {
    this.requireFavoriteCapability(principal, context);
    if (isFavorite) {
      await this.requireEnabled(principal, context);
      const request = await this.requireRequest(requestId);
      this.assertSameMarket(request, context);
      if (
        request.status !== "open" ||
        !request.publishedAt ||
        request.expiresAt <= new Date().toISOString()
      ) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Demande introuvable.",
        });
      }
    }
    try {
      return await this.repository.setFavoriteRequest(
        principal.userId,
        requestId,
        this.requireMarket(context),
        isFavorite,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "DELIVERY_REQUEST_NOT_OPEN"
      ) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Demande introuvable.",
        });
      }
      deliveryError(error, "DELIVERY_APPLICATION_CONFLICT");
    }
  }

  async listOwnRequests(principal: Principal, context: MarketContext) {
    this.requireCapability(principal, "delivery.request.manage.own", context);
    return this.repository.listOwnRequests(
      principal.userId,
      this.requireMarket(context),
    );
  }

  async getPrivateRequest(
    principal: Principal,
    context: MarketContext,
    requestId: string,
  ): Promise<DeliveryPrivateRequest | DeliverySelectedCourierAssignment> {
    requireAuthenticated(principal);
    const request = await this.requireRequest(requestId);
    this.assertSameMarket(request, context);
    const selected = request.applications.find(
      (application) => application.id === request.selectedApplicationId,
    ) as DeliveryApplicationRecord | undefined;
    if (request.requesterId === principal.userId) return request;
    if (selected?.courierUserId !== principal.userId) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Demande introuvable.",
      });
    }
    return selectedCourierAssignment(request, selected);
  }

  async submitApplication(
    principal: Principal,
    context: MarketContext,
    requestId: string,
    input: unknown,
  ) {
    await this.requireEnabled(principal, context);
    this.requireCapability(
      principal,
      "delivery.application.manage.own",
      context,
    );
    const value = deliveryApplicationInputSchema.parse(input);
    const request = await this.requireRequest(requestId);
    this.assertSameMarket(request, context);
    if (request.requesterId === principal.userId)
      throw new AppError({
        code: "DELIVERY_NOT_ELIGIBLE",
        message: "Vous ne pouvez pas répondre à votre propre demande.",
      });
    if (request.status !== "open")
      throw new AppError({
        code: "DELIVERY_REQUEST_NOT_OPEN",
        message: "Cette demande n’accepte plus de candidatures.",
      });
    if (request.expiresAt <= new Date().toISOString())
      throw new AppError({
        code: "DELIVERY_REQUEST_EXPIRED",
        message: "Cette demande a expiré.",
      });
    if (
      await this.repository.areUsersBlocked(
        request.requesterId,
        principal.userId,
      )
    )
      throw new AppError({
        code: "NOT_FOUND",
        message: "Demande introuvable.",
      });
    const profile = await this.repository.getCourierProfile(
      principal.userId,
      request.marketCode,
    );
    if (
      !profile ||
      profile.status !== "active" ||
      profile.eligibilityStatus !== "eligible" ||
      profile.maxWeightGrams < request.package.approximateWeightGrams ||
      (request.package.requiredVehicleType &&
        !profile.vehicleTypes.includes(request.package.requiredVehicleType)) ||
      !profile.serviceLocalities.some(
        (locality) => locality.postalCode === request.pickupLocality.postalCode,
      ) ||
      !profile.serviceLocalities.some(
        (locality) =>
          locality.postalCode === request.dropoffLocality.postalCode,
      )
    ) {
      throw new AppError({
        code: "DELIVERY_NOT_ELIGIBLE",
        message: "Votre profil coursier ne correspond pas à cette demande.",
      });
    }
    try {
      const application = await this.repository.submitApplication(
        request,
        principal.userId,
        principalDisplayName(principal),
        false,
        profile,
        value,
      );
      this.captureEvent(
        "delivery_application_submitted",
        request,
        principal,
        `evt_delivery_application_submitted_${application.id}`,
      );
      return application;
    } catch (error) {
      deliveryError(error, "DELIVERY_APPLICATION_CONFLICT");
    }
  }

  async listOwnApplications(principal: Principal, context: MarketContext) {
    this.requireCapability(
      principal,
      "delivery.application.manage.own",
      context,
    );
    return this.repository.listOwnApplications(
      principal.userId,
      this.requireMarket(context),
    );
  }

  async withdrawApplication(
    principal: Principal,
    context: MarketContext,
    applicationId: string,
  ) {
    this.requireCapability(
      principal,
      "delivery.application.manage.own",
      context,
    );
    const ownApplication = (
      await this.repository.listOwnApplications(
        principal.userId,
        this.requireMarket(context),
      )
    ).find((application) => application.id === applicationId);
    if (!ownApplication)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Candidature introuvable.",
      });
    try {
      return await this.repository.withdrawApplication(
        applicationId,
        principal.userId,
      );
    } catch (error) {
      deliveryError(error, "DELIVERY_APPLICATION_CONFLICT");
    }
  }

  async acceptApplication(
    principal: Principal,
    context: MarketContext,
    requestId: string,
    applicationId: string,
    input: unknown,
  ) {
    await this.requireEnabled(principal, context);
    this.requireCapability(principal, "delivery.request.manage.own", context);
    const value = deliveryAcceptApplicationInputSchema.parse(input);
    try {
      const existing = await this.requireRequest(requestId);
      this.assertSameMarket(existing, context);
      const request = await this.repository.acceptApplication(
        requestId,
        applicationId,
        principal.userId,
        value.expectedVersion,
      );
      const accepted = request.applications.find(
        (application) => application.id === applicationId,
      ) as DeliveryApplicationRecord | undefined;
      if (accepted) {
        this.captureEvent(
          "delivery_application_accepted",
          request,
          principal,
          `evt_delivery_application_accepted_${accepted.id}`,
        );
      }
      return request;
    } catch (error) {
      deliveryError(error, "DELIVERY_ASSIGNMENT_CONFLICT");
    }
  }

  async transition(
    principal: Principal,
    context: MarketContext,
    requestId: string,
    input: unknown,
  ) {
    requireAuthenticated(principal);
    const value = deliveryAssignmentTransitionInputSchema.parse(input);
    const request = await this.requireRequest(requestId);
    this.assertSameMarket(request, context);
    const selected = request.applications.find(
      (application) => application.id === request.selectedApplicationId,
    ) as DeliveryApplicationRecord | undefined;
    const participant =
      request.requesterId === principal.userId
        ? "requester"
        : selected?.courierUserId === principal.userId
          ? "courier"
          : null;
    if (!participant) {
      throw new AppError({
        code: "DELIVERY_NOT_ELIGIBLE",
        message: "Cette demande de livraison n’est pas accessible.",
      });
    }
    this.requireCapability(
      principal,
      participant === "requester"
        ? "delivery.request.manage.own"
        : "delivery.application.manage.own",
      context,
    );
    if (
      !canTransitionDeliveryRequestForParticipant(
        participant,
        request.status,
        value.status,
      )
    )
      throw new AppError({
        code: "DELIVERY_APPLICATION_CONFLICT",
        message: "Cette transition de livraison n’est pas autorisée.",
      });
    // The kill switch deliberately permits only closure-oriented transitions
    // for assignments already in progress.
    const availability = await this.availability(principal, context);
    if (
      !availability.enabled &&
      !["cancelled", "completed", "disputed"].includes(value.status)
    ) {
      throw new AppError({
        code: "DELIVERY_FEATURE_UNAVAILABLE",
        message: "La livraison est temporairement indisponible.",
      });
    }
    try {
      const transitioned = await this.repository.transition(
        requestId,
        principal.userId,
        value.expectedVersion,
        value.status,
        value.note,
      );
      const eventName =
        value.status === "cancelled"
          ? "delivery_request_cancelled"
          : value.status === "completed"
            ? "delivery_request_completed"
            : "delivery_assignment_status_changed";
      this.captureEvent(
        eventName,
        transitioned,
        principal,
        `evt_${eventName}_${transitioned.id}_${transitioned.version}`,
      );
      if (participant === "requester") return transitioned;
      const transitionedSelection = transitioned.applications.find(
        (application) => application.id === transitioned.selectedApplicationId,
      ) as DeliveryApplicationRecord | undefined;
      if (!transitionedSelection) {
        throw new AppError({
          code: "DELIVERY_ASSIGNMENT_CONFLICT",
          message: "L’attribution de cette livraison n’est plus disponible.",
        });
      }
      return selectedCourierAssignment(transitioned, transitionedSelection);
    } catch (error) {
      deliveryError(error, "DELIVERY_ASSIGNMENT_CONFLICT");
    }
  }

  async adminList(principal: Principal, context: MarketContext) {
    this.requireCapability(principal, "delivery.admin.manage", context);
    return this.repository.searchPublic({
      marketCode: this.requireMarket(context),
      limit: 50,
    });
  }

  async suspendUnsafe(
    principal: Principal,
    context: MarketContext,
    requestId: string,
    input: unknown,
  ) {
    this.requireCapability(principal, "delivery.moderate", context);
    const value = deliveryModerationSuspendInputSchema.parse(input);
    const existing = await this.requireRequest(requestId);
    this.assertSameMarket(existing, context);
    try {
      const request = await this.repository.suspendUnsafe(
        requestId,
        principal.userId,
        value.expectedVersion ?? existing.version,
        value.reason,
      );
      this.captureEvent(
        "delivery_assignment_status_changed",
        request,
        principal,
        `evt_delivery_request_suspended_${request.id}_${request.version}`,
      );
      logger.warn(
        `Staff actor ${principal.userId} suspended delivery request ${request.id}`,
      );
      return publicRequest(request);
    } catch (error) {
      deliveryError(error, "DELIVERY_ASSIGNMENT_CONFLICT");
    }
  }

  private async requireEnabled(principal: Principal, context: MarketContext) {
    const availability = await this.availability(principal, context);
    if (!availability.enabled)
      throw new AppError({
        code: "DELIVERY_FEATURE_UNAVAILABLE",
        message:
          "La livraison entre membres n’est pas disponible sur ce marché.",
        details: { reasons: availability.reasons },
      });
    return availability;
  }

  private requireCapability(
    principal: Principal,
    capability:
      | "delivery.request.manage.own"
      | "delivery.courier.manage.own"
      | "delivery.application.manage.own"
      | "delivery.admin.manage"
      | "delivery.moderate",
    context: MarketContext,
  ) {
    const marketCode = this.requireMarket(context);
    if (capability === "delivery.moderate") {
      return requireAuthorization(
        principal,
        {
          capability,
          market: { code: marketCode, enabled: true },
        },
        { marketCodes: [marketCode] },
      );
    }
    return requireAuthorization(
      principal,
      {
        capability,
        featureFlag: DELIVERY_FEATURE_FLAG_KEY,
        market: { code: marketCode, enabled: true },
      },
      {
        marketCodes: [marketCode],
        featureFlags: [DELIVERY_FEATURE_FLAG_KEY],
      },
    );
  }

  private requireFavoriteCapability(
    principal: Principal,
    context: MarketContext,
  ) {
    const marketCode = this.requireMarket(context);
    return requireAuthorization(
      principal,
      {
        capability: "favorite.manage.own",
        market: { code: marketCode, enabled: true },
      },
      { marketCodes: [marketCode] },
    );
  }

  private requireMarket(context: MarketContext): string {
    if (!context.countryCode)
      throw new AppError({
        code: "DELIVERY_MARKET_MISMATCH",
        message: "Un marché explicite est requis.",
      });
    return context.countryCode;
  }

  private async requireRequest(requestId: string) {
    const request = await this.repository.getRequest(requestId);
    if (!request)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Demande introuvable.",
      });
    return request;
  }

  private assertSameMarket(
    request: DeliveryRequestRecord,
    context: MarketContext,
  ) {
    if (request.marketCode !== this.requireMarket(context))
      throw new AppError({
        code: "NOT_FOUND",
        message: "Demande introuvable.",
      });
  }

  private async assertEligibleOrder(
    principal: Principal,
    sourceOrderId: string | undefined,
    marketCode: string,
  ) {
    if (!sourceOrderId)
      throw new AppError({
        code: "DELIVERY_NOT_ELIGIBLE",
        message: "Une commande est requise.",
      });
    const order = await this.orders.getOrderById(sourceOrderId);
    if (
      !order ||
      (order.buyerId !== principal.userId &&
        order.sellerId !== principal.userId) ||
      (order.fulfillmentModel && order.fulfillmentModel !== "PHYSICAL") ||
      !["escrow_funded", "shipped", "pin_pending"].includes(order.status) ||
      order.listing?.marketCode !== marketCode
    ) {
      throw new AppError({
        code: "DELIVERY_NOT_ELIGIBLE",
        message:
          "Cette commande n’est pas éligible à une demande de livraison.",
      });
    }
  }

  private captureEvent(
    name:
      | "delivery_request_started"
      | "delivery_request_published"
      | "delivery_match_completed"
      | "delivery_opportunity_notified"
      | "delivery_application_submitted"
      | "delivery_application_accepted"
      | "delivery_assignment_status_changed"
      | "delivery_request_cancelled"
      | "delivery_request_completed",
    request: DeliveryRequestRecord,
    principal: Principal | undefined,
    eventId: string,
    properties: { eligibleCourierCount?: number } = {},
  ) {
    void this.analytics
      .captureAuthoritative({
        name,
        marketCode: request.marketCode,
        eventId,
        userId: principal?.userId || undefined,
        userType: principal?.accountType || principal?.role,
        properties: {
          originType: request.origin,
          vehicleClass: request.package.requiredVehicleType,
          lifecycleState: request.status,
          applicationCount: request.applicationCount,
          ...properties,
        },
      })
      .catch((error) =>
        logger.warn("delivery_analytics_capture_failed", {
          eventName: name,
          marketCode: request.marketCode,
          error: error instanceof Error ? error.name : "unknown",
        }),
      );
  }
}

export const deliveryService = new DeliveryService();
