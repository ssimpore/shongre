import { IncomingMessage, ServerResponse } from "http";
import {
  authService,
  usersService,
  marketsService,
  taxonomyService,
  listingsService,
  ordersService,
  paymentsService,
  monetizationService,
  businessRulesService,
  verificationService,
  messagingService,
  notificationsService,
  reviewsService,
  workspaceService,
  adminService,
  trendingService,
  coursesService,
  autoService,
  realEstateService,
  employmentService,
  publisherEntitlementsService,
  unifiedDiscoveryService,
  socialAuthService,
  facebookDataDeletionService,
  financeService,
  commissionService,
  complianceService,
  providerControlPlaneService,
} from "../../modules/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { Permission } from "../../shared/auth/rbac.js";
import {
  Principal,
  GUEST_PRINCIPAL,
  requireAuthenticated,
  requirePermission,
  requireOwnership,
  resolveOwnerId,
} from "../../shared/auth/principal.js";
import { extractBearerToken } from "../../shared/auth/tokens.js";
import {
  accessCookie,
  clearSessionCookies,
  oauthCompletionCookie,
  refreshCookie,
  requestMetadata,
  requireCsrf,
  setOAuthCompletionCookie,
  setSessionCookies,
} from "../../shared/auth/http-session.js";
import { verifyStripeSignature } from "../../integrations/stripe/webhook-signature.js";
import { verifyComplianceWebhookSignature } from "../../integrations/providers/compliance-webhook-signature.js";
import { config } from "../../app/config/index.js";
import type {
  TrendingAdminConfig,
  TrendingTopicOverride,
} from "../../modules/trending/trending.types.js";

/**
 * Every route declares who may call it.
 *
 * Making this a required argument rather than an optional flag is the point: a
 * route cannot be added without its author stating an access rule, so "we
 * forgot to add auth to that endpoint" stops being a silent default. `public`
 * is spelled out so that an unauthenticated route is a visible decision in
 * review.
 */
export type RouteAccess =
  | { kind: "public" }
  | { kind: "authenticated" }
  | { kind: "permission"; permission: Permission };

export const PUBLIC: RouteAccess = { kind: "public" };
export const AUTHENTICATED: RouteAccess = { kind: "authenticated" };
export const permission = (p: Permission): RouteAccess => ({
  kind: "permission",
  permission: p,
});

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  body: any;
  principal: Principal;
  query: URLSearchParams;
}

export type RouteHandler = (ctx: RouteContext) => Promise<any>;

function isNativeClient(req: IncomingMessage): boolean {
  return (
    String(req.headers["x-shongre-client"] || "").toLowerCase() === "native"
  );
}

/**
 * Browser sessions are cookie-only. Returning refresh credentials in JSON
 * would undo the HttpOnly boundary even though the same values are also set as
 * secure cookies. Native clients opt into the token response explicitly and
 * persist it in the operating-system keychain.
 */
function publicAuthResult<T extends { user: unknown }>(
  result: T,
  req: IncomingMessage,
): T | { user: T["user"] } {
  return isNativeClient(req) ? result : { user: result.user };
}

interface RouteDef {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  access: RouteAccess;
  handler: RouteHandler;
}

export class ApiV1Router {
  private routes: RouteDef[] = [];

  constructor() {
    this.registerRoutes();
  }

  private addRoute(
    method: string,
    path: string,
    access: RouteAccess,
    handler: RouteHandler,
  ) {
    const paramNames: string[] = [];
    const regexPath = path.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return "([^/]+)";
    });
    const pattern = new RegExp(`^${regexPath}$`);
    this.routes.push({
      method: method.toUpperCase(),
      pattern,
      paramNames,
      access,
      handler,
    });
  }

  /** Canonical Education API plus the non-duplicating legacy mobile alias. */
  private addEducationRoute(
    method: string,
    path: string,
    access: RouteAccess,
    handler: RouteHandler,
  ) {
    for (const basePath of ["/education", "/courses"] as const) {
      this.addRoute(method, `${basePath}${path}`, access, handler);
    }
  }

  private registerRoutes() {
    // --------------------------------------------------------------------------
    // AUTH ROUTES
    // --------------------------------------------------------------------------
    this.addRoute("GET", "/auth/me", PUBLIC, async ({ principal }) =>
      authService.getCurrentUser(principal),
    );
    this.addRoute("POST", "/auth/login", PUBLIC, async ({ body, req, res }) => {
      const result = await authService.login(body, requestMetadata(req));
      if (result.refreshToken && result.expiresAt && result.sessionId) {
        setSessionCookies(res, {
          token: result.token,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt,
          sessionId: result.sessionId,
        });
      }
      return publicAuthResult(result, req);
    });
    this.addRoute(
      "POST",
      "/auth/register",
      PUBLIC,
      async ({ body, req, res }) => {
        const result = await authService.register(body, requestMetadata(req));
        if (result.refreshToken && result.expiresAt && result.sessionId) {
          setSessionCookies(res, {
            token: result.token,
            refreshToken: result.refreshToken,
            expiresAt: result.expiresAt,
            sessionId: result.sessionId,
          });
        }
        return publicAuthResult(result, req);
      },
    );
    this.addRoute(
      "POST",
      "/auth/logout",
      PUBLIC,
      async ({ principal, res }) => {
        await authService.logout(principal);
        clearSessionCookies(res);
        return { success: true };
      },
    );
    this.addRoute(
      "POST",
      "/auth/refresh",
      PUBLIC,
      async ({ body, req, res }) => {
        const result = await authService.refresh(
          body?.refreshToken || refreshCookie(req) || "",
          requestMetadata(req),
        );
        if (!result.refreshToken || !result.expiresAt || !result.sessionId)
          throw new AppError({
            code: "UNAUTHENTICATED",
            message: "Session invalide.",
          });
        setSessionCookies(res, {
          token: result.token,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt,
          sessionId: result.sessionId,
        });
        return publicAuthResult(result, req);
      },
    );
    this.addRoute(
      "POST",
      "/auth/logout-all",
      AUTHENTICATED,
      async ({ principal, body, res }) => {
        await authService.logoutAll(principal, Boolean(body?.keepCurrent));
        if (!body?.keepCurrent) clearSessionCookies(res);
        return { success: true };
      },
    );
    this.addRoute(
      "GET",
      "/auth/sessions",
      AUTHENTICATED,
      async ({ principal }) => ({
        items: await authService.listSessions(principal),
      }),
    );
    this.addRoute(
      "DELETE",
      "/auth/sessions/:id",
      AUTHENTICATED,
      async ({ principal, params, res }) => {
        await authService.revokeSession(principal, params.id);
        if (params.id === principal.sessionId) clearSessionCookies(res);
        return { success: true };
      },
    );
    this.addRoute(
      "POST",
      "/auth/reauthenticate",
      AUTHENTICATED,
      async ({ principal, body }) =>
        authService.reauthenticate(principal, body?.password),
    );
    this.addRoute(
      "POST",
      "/auth/password/change",
      AUTHENTICATED,
      async ({ principal, body }) => {
        await authService.changePassword(
          principal,
          body?.currentPassword,
          body?.newPassword,
        );
        return { success: true };
      },
    );
    this.addRoute(
      "POST",
      "/auth/password/add",
      AUTHENTICATED,
      async ({ principal, body }) => {
        await authService.addPassword(principal, body?.newPassword);
        return { success: true };
      },
    );

    this.addRoute("GET", "/auth/oauth/providers", PUBLIC, async () =>
      socialAuthService.availability(),
    );
    this.addRoute(
      "POST",
      "/auth/oauth/:provider/start",
      PUBLIC,
      async ({ params, body, principal, req }) =>
        socialAuthService.start(
          { ...body, provider: params.provider },
          principal,
          requestMetadata(req),
        ),
    );
    const oauthCallback = async ({
      params,
      body,
      principal: _principal,
      query,
      req,
      res,
    }: RouteContext) => {
      const result = await socialAuthService.callback(
        {
          provider: params.provider,
          state: String(body?.state || query.get("state") || ""),
          code: String(body?.code || query.get("code") || ""),
          error: String(body?.error || query.get("error") || ""),
          appleUser: body?.user || null,
        },
        requestMetadata(req),
      );

      const frontendBase =
        config.frontendUrl ||
        config.oauthAllowedReturnOrigins[0] ||
        "http://localhost:3000";
      const webCallback = new URL("/auth/callback", frontendBase);
      webCallback.searchParams.set("provider", params.provider);
      webCallback.searchParams.set("status", result.status);
      webCallback.searchParams.set("returnTo", result.returnTo);
      if (result.status === "authenticated" && result.onboarding)
        webCallback.searchParams.set("onboarding", result.onboarding);
      if (result.status === "link_required")
        webCallback.searchParams.set("account", result.maskedEmail);

      if (
        result.status === "authenticated" &&
        result.clientKind === "web" &&
        result.tokens
      ) {
        setSessionCookies(res, result.tokens);
      }
      if (result.status === "email_required") {
        if (result.clientKind === "web") {
          setOAuthCompletionCookie(res, result.completionHandle);
        } else {
          const nativeTarget = new URL(config.mobileAuthCallbackUrl);
          nativeTarget.hash = new URLSearchParams({
            status: result.status,
            completion: result.completionHandle,
          }).toString();
          return redirectResponse(res, nativeTarget.toString());
        }
      }
      if (
        result.status === "authenticated" &&
        result.clientKind === "native" &&
        result.nativeExchangeCode
      ) {
        const nativeTarget = new URL(config.mobileAuthCallbackUrl);
        nativeTarget.hash = new URLSearchParams({
          status: "success",
          exchange: result.nativeExchangeCode,
        }).toString();
        return redirectResponse(res, nativeTarget.toString());
      }
      return redirectResponse(res, webCallback.toString());
    };
    this.addRoute(
      "GET",
      "/auth/oauth/:provider/callback",
      PUBLIC,
      oauthCallback,
    );
    this.addRoute(
      "POST",
      "/auth/oauth/:provider/callback",
      PUBLIC,
      oauthCallback,
    );
    this.addRoute(
      "POST",
      "/auth/oauth/complete-profile",
      PUBLIC,
      async ({ body, req }) =>
        socialAuthService.completePendingRegistration({
          completionHandle:
            body?.completionHandle || oauthCompletionCookie(req) || "",
          email: body?.email,
          accountType: body?.accountType,
        }),
    );
    this.addRoute(
      "POST",
      "/auth/oauth/native-exchange",
      PUBLIC,
      async ({ body, req }) => {
        const result = await socialAuthService.exchangeNativeCode(
          body?.code,
          requestMetadata(req),
        );
        return {
          user: result.user,
          ...result.tokens,
          returnTo: result.returnTo,
        };
      },
    );
    this.addRoute(
      "GET",
      "/auth/security",
      AUTHENTICATED,
      async ({ principal }) =>
        socialAuthService.securityOverview(
          principal.userId,
          principal.sessionId,
        ),
    );
    this.addRoute(
      "DELETE",
      "/auth/identities/:provider",
      AUTHENTICATED,
      async ({ principal, params }) => {
        await socialAuthService.unlink(
          principal.userId,
          principal.sessionId,
          params.provider,
        );
        return { success: true };
      },
    );
    this.addRoute(
      "POST",
      "/auth/oauth/facebook/data-deletion",
      PUBLIC,
      async ({ body }) =>
        facebookDataDeletionService.request(body?.signed_request),
    );
    this.addRoute(
      "GET",
      "/auth/oauth/facebook/data-deletion/status",
      PUBLIC,
      async ({ query }) =>
        facebookDataDeletionService.status(query.get("code") || ""),
    );
    this.addRoute(
      "POST",
      "/auth/switch-role",
      AUTHENTICATED,
      async ({ principal, body }) =>
        authService.switchRole(principal, body?.role),
    );
    this.addRoute(
      "POST",
      "/auth/verify-phone",
      AUTHENTICATED,
      async ({ principal, body }) => {
        const verified = await authService.verifyPhone(
          principal,
          body?.phone,
          body?.code,
        );
        return { verified };
      },
    );
    // Email confirmation arrives from a mail link, so the caller is not yet
    // signed in; the signed token in the body is the credential.
    this.addRoute("POST", "/auth/verify-email", PUBLIC, async ({ body }) => {
      const verified = await authService.verifyEmail(body?.token);
      return { verified };
    });
    this.addRoute(
      "POST",
      "/auth/verify-email/resend",
      PUBLIC,
      async ({ body, req }) =>
        authService.sendEmailVerification(body?.email, requestMetadata(req)),
    );
    this.addRoute(
      "POST",
      "/auth/password/forgot",
      PUBLIC,
      async ({ body, req }) =>
        authService.requestPasswordReset(body?.email, requestMetadata(req)),
    );
    this.addRoute(
      "POST",
      "/auth/password/reset",
      PUBLIC,
      async ({ body, res }) => {
        await authService.resetPassword(body?.token, body?.newPassword);
        clearSessionCookies(res);
        return { success: true };
      },
    );

    // --------------------------------------------------------------------------
    // USERS ROUTES
    // --------------------------------------------------------------------------
    // Public seller profiles are part of the marketplace surface.
    this.addRoute("GET", "/users/:id", PUBLIC, async ({ params }) =>
      usersService.getUserById(params.id),
    );
    this.addRoute(
      "PUT",
      "/users/:id",
      permission("profile.update.own"),
      async ({ principal, params, body }) => {
        const ownerId = resolveOwnerId(principal, params.id, "user.manage");
        return usersService.updateUserProfile(
          ownerId,
          sanitizeProfileUpdate(body, principal),
        );
      },
    );
    this.addRoute(
      "POST",
      "/account/delete",
      AUTHENTICATED,
      async ({ principal, body }) =>
        usersService.deleteOwnAccount(
          principal.userId,
          body?.password,
          body?.reason,
        ),
    );

    // --------------------------------------------------------------------------
    // LISTINGS & SEARCH ROUTES
    // --------------------------------------------------------------------------
    this.addRoute("GET", "/listings", PUBLIC, async ({ query }) => {
      const params = Object.fromEntries(query.entries());
      return listingsService.getListings(params as any);
    });
    this.addRoute("GET", "/listings/:id", PUBLIC, async ({ params }) =>
      listingsService.getListingById(params.id),
    );
    this.addRoute("POST", "/listings/search", PUBLIC, async ({ body }) =>
      listingsService.searchListings(body || {}),
    );
    this.addRoute("GET", "/home/trending", PUBLIC, async ({ query }) =>
      trendingService.getSection({
        marketCode: query.get("market") || query.get("country") || "FR",
        region: query.get("region") || undefined,
        city: query.get("city") || undefined,
        limit: query.get("limit") ? Number(query.get("limit")) : undefined,
      }),
    );
    this.addRoute(
      "POST",
      "/listings/drafts",
      permission("listing.create"),
      async ({ principal }) =>
        listingsService.createListingDraft(principal.userId),
    );
    this.addRoute(
      "PUT",
      "/listings/drafts/:userId",
      permission("listing.create"),
      async ({ principal, params, body }) => {
        const ownerId = resolveOwnerId(principal, params.userId);
        await listingsService.saveListingDraft(body, ownerId);
        return { success: true };
      },
    );
    this.addRoute(
      "POST",
      "/listings/publish",
      permission("listing.publish"),
      async ({ principal, body }) => {
        const subject = await complianceService.getSubject(principal.userId);
        await complianceService.requireForUser(principal.userId, {
          requestedAction:
            subject.accountType === "professional"
              ? "publish_professional_listing"
              : "publish_listing",
          jurisdiction: body?.draft?.country || subject.country || "FR",
          marketCode: body?.draft?.marketCode || "FR",
          categoryId: body?.draft?.categoryId,
          transactionContext: {
            transactionType: "classified",
            contractConclusionMode: "off_platform",
            paymentFlow: "none",
          },
        });
        // The seller is the caller. Taking sellerId from the body would let anyone
        // publish listings under another account's name.
        return listingsService.publishListing(body?.draft, principal.userId);
      },
    );
    this.addRoute(
      "POST",
      "/publication/entitlements",
      permission("listing.create"),
      async ({ principal, body }) =>
        publisherEntitlementsService.getPublicationEntitlements({
          actorUserId: principal.userId,
          organizationId: body?.organizationId,
          branchId: body?.branchId,
          marketCode: body?.marketCode || "FR",
          categoryId: body?.categoryId,
        }),
    );
    this.addRoute(
      "PUT",
      "/listings/:id",
      permission("listing.update.own"),
      async ({ principal, params, body }) => {
        await this.assertListingOwnership(principal, params.id);
        return listingsService.updateListing(params.id, body);
      },
    );
    this.addRoute(
      "DELETE",
      "/listings/:id",
      permission("listing.delete.own"),
      async ({ principal, params }) => {
        await this.assertListingOwnership(principal, params.id);
        const success = await listingsService.deleteListing(params.id);
        return { success };
      },
    );
    this.addRoute(
      "POST",
      "/listings/:id/favorite",
      permission("favorite.manage.own"),
      async ({ principal, params }) => {
        const isFavorite = await listingsService.toggleFavorite(
          params.id,
          principal.userId,
        );
        return { isFavorite };
      },
    );
    this.addRoute(
      "GET",
      "/favorites",
      permission("favorite.manage.own"),
      async ({ principal }) => {
        const listingIds = await listingsService.getFavorites(principal.userId);
        return { listingIds };
      },
    );

    // --------------------------------------------------------------------------
    // TAXONOMY ROUTES (public catalogue metadata)
    // --------------------------------------------------------------------------
    this.addRoute("GET", "/taxonomy/root", PUBLIC, async () =>
      taxonomyService.getRootCategories(),
    );
    this.addRoute("GET", "/taxonomy/nodes/:id", PUBLIC, async ({ params }) =>
      taxonomyService.getNodeById(params.id),
    );
    this.addRoute("GET", "/taxonomy/slug/:slug", PUBLIC, async ({ params }) =>
      taxonomyService.getNodeBySlug(params.slug),
    );
    this.addRoute("GET", "/taxonomy/:id/children", PUBLIC, async ({ params }) =>
      taxonomyService.getChildren(params.id),
    );
    this.addRoute(
      "GET",
      "/taxonomy/:id/attributes",
      PUBLIC,
      async ({ params }) => taxonomyService.getAttributesForCategory(params.id),
    );
    this.addRoute(
      "GET",
      "/taxonomy/search-filters",
      PUBLIC,
      async ({ query }) =>
        taxonomyService.resolveSearchFilters(query.get("nodeId") || undefined),
    );

    // --------------------------------------------------------------------------
    // SHONGRE EDUCATION (versioned course/tutoring vertical)
    // --------------------------------------------------------------------------
    this.addEducationRoute("GET", "/catalog", PUBLIC, async ({ query }) =>
      coursesService.getCatalog(query.get("market") || "FR"),
    );
    this.addEducationRoute("POST", "/search", PUBLIC, async ({ body }) =>
      coursesService.searchTutors(body || { marketCode: "FR" }),
    );
    this.addEducationRoute("GET", "/tutors/:id", PUBLIC, async ({ params }) =>
      coursesService.getTutorPublicProfile(params.id),
    );
    this.addEducationRoute(
      "PUT",
      "/tutors/:id",
      permission("course.profile.manage.own"),
      async ({ principal, params, body }) =>
        coursesService.saveOwnTutorProfile(principal.userId, {
          ...body,
          id: params.id,
        }),
    );
    this.addEducationRoute(
      "POST",
      "/offers",
      permission("course.offer.manage.own"),
      async ({ principal, body }) =>
        coursesService.createOwnCourseOffer(principal.userId, body),
    );
    this.addEducationRoute(
      "POST",
      "/learner-requests",
      permission("course.request.create"),
      async ({ principal, body }) =>
        coursesService.submitLearnerRequest(principal.userId, body),
    );
    this.addEducationRoute(
      "GET",
      "/workspace/:tutorProfileId",
      permission("course.lead.read.own"),
      async ({ principal, params }) =>
        coursesService.getOwnTutorWorkspace(
          principal.userId,
          params.tutorProfileId,
        ),
    );
    this.addEducationRoute(
      "GET",
      "/organizations/:organizationId/workspace",
      permission("course.organization.manage.own"),
      async ({ principal, params }) =>
        coursesService.getOwnOrganizationWorkspace(
          principal.userId,
          params.organizationId,
        ),
    );
    this.addEducationRoute(
      "PATCH",
      "/leads/:leadId",
      permission("course.lead.respond.own"),
      async ({ principal, params, body }) =>
        coursesService.respondToOwnLead(
          principal.userId,
          body?.tutorProfileId,
          params.leadId,
          body?.decision,
          body?.declineReason,
        ),
    );
    this.addRoute(
      "POST",
      "/real-estate/agencies/:organizationId/leads/:leadId/notes",
      permission("immo.lead.manage.own"),
      async ({ principal, params, body }) =>
        realEstateService.addOwnLeadNote(
          principal.userId,
          params.organizationId,
          params.leadId,
          body?.body,
        ),
    );
    this.addRoute(
      "GET",
      "/real-estate/agencies/:organizationId/leads/export",
      permission("immo.lead.manage.own"),
      async ({ principal, params }) =>
        realEstateService.exportOwnAgencyLeads(
          principal.userId,
          params.organizationId,
        ),
    );
    this.addEducationRoute(
      "POST",
      "/bookings",
      permission("course.booking.create"),
      async ({ principal, body }) =>
        coursesService.createBooking(
          principal.userId,
          body?.marketCode || "FR",
          body?.booking,
        ),
    );
    this.addEducationRoute(
      "GET",
      "/admin/catalog",
      permission("course.admin.manage"),
      async ({ query }) =>
        coursesService.getAdminCatalog(query.get("market") || "FR"),
    );
    this.addEducationRoute(
      "PUT",
      "/admin/markets/:marketCode",
      permission("course.admin.manage"),
      async ({ params, body }) =>
        coursesService.updateMarketConfig(params.marketCode, body),
    );
    this.addEducationRoute(
      "PATCH",
      "/admin/markets/:marketCode/subjects/:subjectId",
      permission("course.admin.manage"),
      async ({ params, body }) =>
        coursesService.updateSubject(params.marketCode, params.subjectId, body),
    );
    this.addEducationRoute(
      "PATCH",
      "/admin/markets/:marketCode/plans/:planId",
      permission("course.admin.manage"),
      async ({ params, body }) =>
        coursesService.updatePlan(params.marketCode, params.planId, body),
    );

    // --------------------------------------------------------------------------
    // SHONGRE AUTO (versioned automotive vertical)
    // --------------------------------------------------------------------------
    this.addRoute("GET", "/auto/catalog", PUBLIC, async ({ query }) =>
      autoService.getCatalog(query.get("market") || "FR"),
    );
    this.addRoute("POST", "/auto/search", PUBLIC, async ({ body }) =>
      autoService.search(body || { marketCode: "FR" }),
    );
    this.addRoute("GET", "/auto/vehicles/:id", PUBLIC, async ({ params }) =>
      autoService.getPublicVehicle(params.id),
    );
    this.addRoute(
      "GET",
      "/auto/drafts/:id",
      permission("auto.vehicle.manage.own"),
      async ({ principal, params }) =>
        autoService.getOwnDraft(principal.userId, params.id),
    );
    this.addRoute(
      "PUT",
      "/auto/drafts/:id",
      permission("auto.vehicle.manage.own"),
      async ({ principal, params, body }) =>
        autoService.saveOwnDraft(principal.userId, params.id, body),
    );
    this.addRoute(
      "POST",
      "/auto/drafts/:id/duplicate-check",
      permission("auto.vehicle.manage.own"),
      async ({ principal, params, body }) =>
        autoService.checkDuplicateIdentity(
          principal.userId,
          params.id,
          body?.vin,
          body?.registration,
        ),
    );
    this.addRoute(
      "POST",
      "/auto/drafts/:id/submit",
      permission("auto.vehicle.manage.own"),
      async ({ principal, params }) =>
        autoService.submitOwnDraft(principal.userId, params.id),
    );
    this.addRoute(
      "POST",
      "/auto/vehicles",
      permission("auto.vehicle.manage.own"),
      async ({ principal, body }) =>
        autoService.saveOwnVehicle(principal.userId, body),
    );
    this.addRoute("POST", "/auto/leads", PUBLIC, async ({ principal, body }) =>
      autoService.submitLead(
        principal.role === "guest" ? undefined : principal.userId,
        body,
      ),
    );
    this.addRoute(
      "GET",
      "/auto/dealers/:organizationId/workspace",
      permission("auto.dealer.manage.own"),
      async ({ principal, params }) =>
        autoService.getOwnDealerWorkspace(
          principal.userId,
          params.organizationId,
        ),
    );
    this.addRoute(
      "PATCH",
      "/auto/dealers/:organizationId/leads/:leadId",
      permission("auto.lead.manage.own"),
      async ({ principal, params, body }) =>
        autoService.updateOwnLead(
          principal.userId,
          params.organizationId,
          params.leadId,
          body,
        ),
    );
    this.addRoute(
      "POST",
      "/auto/dealers/:organizationId/imports",
      permission("auto.inventory.import.own"),
      async ({ principal, params, body }) =>
        autoService.requestInventoryImport(
          principal.userId,
          params.organizationId,
          body?.type,
          body?.fileName,
          body?.idempotencyKey,
        ),
    );
    this.addRoute(
      "GET",
      "/auto/admin/overview",
      permission("auto.admin.manage"),
      async ({ query }) =>
        autoService.getAdminOverview(query.get("market") || "FR"),
    );
    this.addRoute(
      "PUT",
      "/auto/admin/markets/:marketCode",
      permission("auto.admin.manage"),
      async ({ params, body }) =>
        autoService.updateMarketConfig(params.marketCode, body),
    );
    this.addRoute(
      "PATCH",
      "/auto/admin/markets/:marketCode/plans/:planId",
      permission("auto.admin.manage"),
      async ({ params, body }) =>
        autoService.updatePlan(params.marketCode, params.planId, body),
    );
    this.addRoute(
      "PATCH",
      "/auto/admin/markets/:marketCode/add-ons/:addOnId",
      permission("auto.admin.manage"),
      async ({ params, body }) =>
        autoService.updateAddOn(params.marketCode, params.addOnId, body),
    );
    this.addRoute(
      "PATCH",
      "/auto/admin/markets/:marketCode/types/:type",
      permission("auto.admin.manage"),
      async ({ params, body }) =>
        autoService.updateVehicleType(params.marketCode, params.type, body),
    );

    // --------------------------------------------------------------------------
    // SHONGRE IMMO (reusable real_estate vertical)
    // --------------------------------------------------------------------------
    this.addRoute("GET", "/real-estate/catalog", PUBLIC, async ({ query }) =>
      realEstateService.getCatalog(query.get("market") || "FR"),
    );
    this.addRoute("POST", "/real-estate/search", PUBLIC, async ({ body }) =>
      realEstateService.search(body || { marketCode: "FR", sort: "relevance" }),
    );
    this.addRoute(
      "GET",
      "/real-estate/properties/:id",
      PUBLIC,
      async ({ params }) => realEstateService.getPublicProperty(params.id),
    );
    this.addRoute(
      "GET",
      "/real-estate/properties/:id/comparables",
      PUBLIC,
      async ({ params }) =>
        realEstateService.getComparableProperties(params.id),
    );
    this.addRoute(
      "GET",
      "/real-estate/drafts/:id",
      permission("immo.property.manage.own"),
      async ({ principal, params }) =>
        realEstateService.getOwnDraft(principal.userId, params.id),
    );
    this.addRoute(
      "PUT",
      "/real-estate/drafts/:id",
      permission("immo.property.manage.own"),
      async ({ principal, params, body }) =>
        realEstateService.saveOwnDraft(principal.userId, params.id, body),
    );
    this.addRoute(
      "POST",
      "/real-estate/drafts/:id/submit",
      permission("immo.property.manage.own"),
      async ({ principal, params }) =>
        realEstateService.submitOwnDraft(principal.userId, params.id),
    );
    this.addRoute(
      "GET",
      "/real-estate/properties/:id/documents/:documentId/access",
      permission("immo.property.manage.own"),
      async ({ principal, params }) =>
        realEstateService.getOwnPrivateDocumentAccess(
          principal.userId,
          params.id,
          params.documentId,
        ),
    );
    this.addRoute(
      "POST",
      "/real-estate/leads",
      PUBLIC,
      async ({ principal, body }) =>
        realEstateService.submitLead(
          principal.role === "guest" ? undefined : principal.userId,
          body,
        ),
    );
    this.addRoute(
      "POST",
      "/real-estate/leads/:leadId/appointments",
      AUTHENTICATED,
      async ({ principal, params, body }) =>
        realEstateService.requestAppointment(
          principal.userId,
          params.leadId,
          body?.startsAt,
        ),
    );
    this.addRoute(
      "GET",
      "/real-estate/agencies/:organizationId/workspace",
      permission("immo.agency.manage.own"),
      async ({ principal, params }) =>
        realEstateService.getOwnAgencyWorkspace(
          principal.userId,
          params.organizationId,
        ),
    );
    this.addRoute(
      "PATCH",
      "/real-estate/agencies/:organizationId/leads/:leadId",
      permission("immo.lead.manage.own"),
      async ({ principal, params, body }) =>
        realEstateService.updateOwnLead(
          principal.userId,
          params.organizationId,
          params.leadId,
          body,
        ),
    );
    this.addRoute(
      "POST",
      "/real-estate/agencies/:organizationId/imports",
      permission("immo.inventory.import.own"),
      async ({ principal, params, body }) =>
        realEstateService.requestImport(
          principal.userId,
          params.organizationId,
          body?.type,
          body?.fileName,
          body?.idempotencyKey,
        ),
    );
    this.addRoute(
      "POST",
      "/real-estate/checkouts",
      permission("payment.initiate"),
      async ({ principal, body }) =>
        realEstateService.createCheckout(principal.userId, body),
    );
    this.addRoute(
      "POST",
      "/real-estate/checkouts/:checkoutId/refunds",
      permission("payment.refund"),
      async ({ params, body }) =>
        realEstateService.refundCheckout(params.checkoutId, body || {}),
    );
    this.addRoute(
      "GET",
      "/real-estate/admin/overview",
      permission("immo.admin.manage"),
      async ({ query }) =>
        realEstateService.getAdminOverview(query.get("market") || "FR"),
    );
    this.addRoute(
      "PUT",
      "/real-estate/admin/markets/:marketCode",
      permission("immo.admin.manage"),
      async ({ params, body }) =>
        realEstateService.updateMarketConfig(params.marketCode, body),
    );
    this.addRoute(
      "PATCH",
      "/real-estate/admin/markets/:marketCode/offers/:offerId",
      permission("immo.admin.manage"),
      async ({ params, body }) =>
        realEstateService.updateOffer(params.marketCode, params.offerId, body),
    );
    this.addRoute(
      "PATCH",
      "/real-estate/admin/markets/:marketCode/add-ons/:addOnId",
      permission("immo.admin.manage"),
      async ({ params, body }) =>
        realEstateService.updateAddOn(params.marketCode, params.addOnId, body),
    );
    this.addRoute(
      "PATCH",
      "/real-estate/admin/markets/:marketCode/types/:type",
      permission("immo.admin.manage"),
      async ({ params, body }) =>
        realEstateService.updatePropertyType(
          params.marketCode,
          params.type,
          body,
        ),
    );
    this.addRoute(
      "PATCH",
      "/real-estate/admin/markets/:marketCode/field-rules/:ruleId",
      permission("immo.admin.manage"),
      async ({ params, body }) =>
        realEstateService.updateFieldRule(
          params.marketCode,
          params.ruleId,
          body,
        ),
    );

    // --------------------------------------------------------------------------
    // SHONGRE EMPLOI (specialized employment vertical on canonical jobs branch)
    // --------------------------------------------------------------------------
    this.addRoute("GET", "/employment/catalog", PUBLIC, async ({ query }) =>
      employmentService.getCatalog(query.get("market") || "FR"),
    );
    this.addRoute("POST", "/employment/search", PUBLIC, async ({ body }) =>
      employmentService.search(body || { marketCode: "FR" }),
    );
    this.addRoute("GET", "/employment/jobs/:id", PUBLIC, async ({ params }) =>
      employmentService.getPublicJob(params.id),
    );
    this.addRoute(
      "GET",
      "/employment/jobs/:id/similar",
      PUBLIC,
      async ({ params }) => employmentService.getSimilarJobs(params.id),
    );
    this.addRoute(
      "GET",
      "/employment/drafts/:id",
      permission("employment.job.manage.own"),
      async ({ principal, params }) =>
        employmentService.getOwnDraft(principal.userId, params.id),
    );
    this.addRoute(
      "PUT",
      "/employment/drafts/:id",
      permission("employment.job.manage.own"),
      async ({ principal, params, body }) =>
        employmentService.saveOwnDraft(principal.userId, params.id, body),
    );
    this.addRoute(
      "POST",
      "/employment/drafts/:id/duplicate-check",
      permission("employment.job.manage.own"),
      async ({ principal, params }) =>
        employmentService.checkDuplicateDraft(principal.userId, params.id),
    );
    this.addRoute(
      "POST",
      "/employment/drafts/:id/submit",
      permission("employment.job.manage.own"),
      async ({ principal, params }) =>
        employmentService.submitOwnDraft(principal.userId, params.id),
    );
    this.addRoute(
      "POST",
      "/employment/compliance/prohibited-language",
      permission("employment.job.manage.own"),
      async ({ body }) => ({
        flags: await employmentService.flagProhibitedLanguage(
          body?.content,
          body?.marketCode || "FR",
        ),
      }),
    );
    this.addRoute(
      "GET",
      "/employment/candidate/workspace",
      permission("employment.candidate.manage.own"),
      async ({ principal }) =>
        employmentService.getOwnCandidateWorkspace(principal.userId),
    );
    this.addRoute(
      "PUT",
      "/employment/candidate/profile",
      permission("employment.candidate.manage.own"),
      async ({ principal, body }) =>
        employmentService.saveOwnCandidateProfile(principal.userId, body),
    );
    this.addRoute(
      "POST",
      "/employment/jobs/:id/applications",
      permission("employment.candidate.manage.own"),
      async ({ principal, params, body }) =>
        employmentService.apply(principal.userId, params.id, body),
    );
    this.addRoute(
      "POST",
      "/employment/applications/:id/withdraw",
      permission("employment.candidate.manage.own"),
      async ({ principal, params }) =>
        employmentService.withdrawOwnApplication(principal.userId, params.id),
    );
    this.addRoute(
      "POST",
      "/employment/jobs/:id/save",
      permission("employment.candidate.manage.own"),
      async ({ principal, params }) =>
        employmentService.toggleSavedJob(principal.userId, params.id),
    );
    this.addRoute(
      "POST",
      "/employment/jobs/:id/report",
      permission("employment.candidate.manage.own"),
      async ({ principal, params, body }) =>
        employmentService.reportJob(principal.userId, params.id, body),
    );
    this.addRoute(
      "POST",
      "/employment/candidate/alerts",
      permission("employment.candidate.manage.own"),
      async ({ principal, body }) =>
        employmentService.saveOwnJobAlert(principal.userId, body),
    );
    this.addRoute(
      "DELETE",
      "/employment/candidate/alerts/:id",
      permission("employment.candidate.manage.own"),
      async ({ principal, params }) =>
        employmentService.deleteOwnJobAlert(principal.userId, params.id),
    );
    this.addRoute(
      "POST",
      "/employment/candidate/data-export",
      permission("employment.candidate.manage.own"),
      async ({ principal }) =>
        employmentService.exportOwnCandidateData(principal.userId),
    );
    this.addRoute(
      "POST",
      "/employment/candidate/deletion-request",
      permission("employment.candidate.manage.own"),
      async ({ principal }) =>
        employmentService.requestOwnCandidateDeletion(principal.userId),
    );
    this.addRoute(
      "PATCH",
      "/employment/candidate/interviews/:id",
      permission("employment.candidate.manage.own"),
      async ({ principal, params, body }) =>
        employmentService.respondToOwnInterview(
          principal.userId,
          params.id,
          body,
        ),
    );
    this.addRoute(
      "GET",
      "/employment/recruiter/employers",
      permission("employment.recruiter.manage.own"),
      async ({ principal }) =>
        employmentService.listOwnRecruiterEmployers(principal.userId),
    );
    this.addRoute(
      "GET",
      "/employment/employers/:employerId/workspace",
      permission("employment.recruiter.manage.own"),
      async ({ principal, params }) =>
        employmentService.getOwnRecruiterWorkspace(
          principal.userId,
          params.employerId,
        ),
    );
    this.addRoute(
      "POST",
      "/employment/employers/:employerId/jobs/:jobId/duplicate",
      permission("employment.recruiter.manage.own"),
      async ({ principal, params }) =>
        employmentService.duplicateOwnJob(
          principal.userId,
          params.employerId,
          params.jobId,
        ),
    );
    this.addRoute(
      "PATCH",
      "/employment/employers/:employerId/applications/:applicationId/stage",
      permission("employment.application.manage.own"),
      async ({ principal, params, body }) =>
        employmentService.moveApplication(
          principal.userId,
          params.employerId,
          params.applicationId,
          body,
        ),
    );
    this.addRoute(
      "POST",
      "/employment/employers/:employerId/applications/:applicationId/notes",
      permission("employment.application.manage.own"),
      async ({ principal, params, body }) =>
        employmentService.addRecruiterNote(
          principal.userId,
          params.employerId,
          params.applicationId,
          body?.body,
        ),
    );
    this.addRoute(
      "POST",
      "/employment/employers/:employerId/applications/:applicationId/interviews",
      permission("employment.application.manage.own"),
      async ({ principal, params, body }) =>
        employmentService.scheduleInterview(
          principal.userId,
          params.employerId,
          params.applicationId,
          body,
        ),
    );
    this.addRoute(
      "POST",
      "/employment/employers/:employerId/imports/preview",
      permission("employment.import.own"),
      async ({ principal, params, body }) =>
        employmentService.previewImport(
          principal.userId,
          params.employerId,
          body,
        ),
    );
    this.addRoute(
      "POST",
      "/employment/employers/:employerId/imports",
      permission("employment.import.own"),
      async ({ principal, params, body }) =>
        employmentService.requestImport(
          principal.userId,
          params.employerId,
          body,
        ),
    );
    this.addRoute(
      "POST",
      "/employment/checkouts",
      permission("payment.initiate"),
      async ({ principal, body }) =>
        employmentService.createCheckout(principal.userId, body),
    );
    this.addRoute(
      "GET",
      "/employment/admin/overview",
      permission("employment.admin.manage"),
      async ({ query }) =>
        employmentService.getAdminOverview(query.get("market") || "FR"),
    );
    this.addRoute(
      "PUT",
      "/employment/admin/markets/:marketCode",
      permission("employment.admin.manage"),
      async ({ principal, params, body }) =>
        employmentService.updateMarketConfig(
          principal.userId,
          params.marketCode,
          body,
        ),
    );
    this.addRoute(
      "PATCH",
      "/employment/admin/offers/:offerId",
      permission("employment.admin.manage"),
      async ({ principal, params, body }) =>
        employmentService.updateOffer(principal.userId, params.offerId, body),
    );

    // --------------------------------------------------------------------------
    // MARKETS ROUTES
    // --------------------------------------------------------------------------
    this.addRoute("GET", "/markets", PUBLIC, async () =>
      marketsService.getAllMarkets(),
    );
    this.addRoute("GET", "/markets/active", PUBLIC, async () =>
      marketsService.getActiveMarket(),
    );
    // Enabling or switching a market is an operator action, not a visitor
    // preference: it changes what the platform serves.
    this.addRoute(
      "POST",
      "/markets/active",
      permission("market.manage"),
      async ({ body }) => marketsService.setActiveMarket(body?.code),
    );
    this.addRoute("GET", "/markets/:code", PUBLIC, async ({ params }) =>
      marketsService.getMarketByCode(params.code),
    );
    this.addRoute(
      "GET",
      "/markets/effective/:code",
      PUBLIC,
      async ({ params }) =>
        marketsService.getEffectiveMarketConfig(params.code),
    );

    // --------------------------------------------------------------------------
    // ORDERS & ESCROW ROUTES
    // --------------------------------------------------------------------------
    this.addRoute(
      "GET",
      "/orders/:id",
      permission("order.read.own"),
      async ({ principal, params }) => {
        const order = await ordersService.getOrderById(params.id);
        return this.assertOrderParticipant(principal, order);
      },
    );
    this.addRoute(
      "GET",
      "/orders/purchases/:userId",
      permission("order.read.own"),
      async ({ principal, params }) =>
        ordersService.getPurchases(resolveOwnerId(principal, params.userId)),
    );
    this.addRoute(
      "GET",
      "/orders/sales/:userId",
      permission("order.manage.seller"),
      async ({ principal, params }) =>
        ordersService.getSales(resolveOwnerId(principal, params.userId)),
    );
    this.addRoute(
      "POST",
      "/orders/direct-purchase",
      permission("order.create"),
      async ({ principal, body }) =>
        ordersService.createDirectPurchase({
          ...body,
          buyerId: principal.userId,
        }),
    );
    this.addRoute(
      "POST",
      "/orders/reservation",
      permission("order.create"),
      async ({ principal, body }) =>
        ordersService.createReservation({ ...body, buyerId: principal.userId }),
    );
    this.addRoute(
      "POST",
      "/orders/:id/confirm-pin",
      AUTHENTICATED,
      async ({ principal, params, body }) => {
        const order = await ordersService.getOrderById(params.id);
        this.assertOrderParticipant(principal, order);
        return ordersService.confirmHandoverPIN(params.id, body?.pin);
      },
    );
    this.addRoute(
      "POST",
      "/orders/:id/confirm-delivery",
      AUTHENTICATED,
      async ({ principal, params }) => {
        const order = await ordersService.getOrderById(params.id);
        this.assertOrderParticipant(principal, order);
        return ordersService.confirmDeliveryReceived(params.id);
      },
    );
    this.addRoute(
      "POST",
      "/orders/:id/dispute",
      AUTHENTICATED,
      async ({ principal, params, body }) => {
        const order = await ordersService.getOrderById(params.id);
        this.assertOrderParticipant(principal, order);
        return ordersService.openDispute(
          params.id,
          body?.reason,
          body?.details,
        );
      },
    );
    this.addRoute(
      "POST",
      "/orders/:id/refund",
      permission("order.refund"),
      async ({ params, body }) => ordersService.refundOrder(params.id, body),
    );

    // --------------------------------------------------------------------------
    // PAYMENTS ROUTES
    // --------------------------------------------------------------------------
    this.addRoute(
      "POST",
      "/payments/intent",
      permission("payment.initiate"),
      async ({ principal, body }) =>
        businessRulesService.createCheckout(
          principal.userId,
          body?.quoteId,
          body?.idempotencyKey,
        ),
    );
    // Payouts move money to a bank account. The destination is the caller's own
    // seller account, never an id supplied in the request body.
    this.addRoute(
      "POST",
      "/payments/payout",
      permission("order.manage.seller"),
      async ({ principal, body }) =>
        complianceService
          .requireForUser(principal.userId, {
            requestedAction: "receive_payout",
            jurisdiction: body?.jurisdiction || "FR",
            marketCode: body?.marketCode || "FR",
            transactionContext: {
              transactionType: "direct_purchase",
              contractConclusionMode: "platform",
              paymentFlow: "psp_marketplace",
              amountMinor: body?.amount,
              currency: body?.currency || "EUR",
            },
          })
          .then(() =>
            paymentsService.requestSellerPayout(
              principal.userId,
              body?.amount,
            ),
          ),
    );
    this.addRoute(
      "GET",
      "/payments/balance/:sellerId",
      permission("order.manage.seller"),
      async ({ principal, params }) =>
        paymentsService.getSellerBalance(
          resolveOwnerId(principal, params.sellerId, "payment.refund"),
        ),
    );

    // --------------------------------------------------------------------------
    // PROMOTIONS & MONETIZATION ROUTES
    // --------------------------------------------------------------------------
    this.addRoute("GET", "/business-rules/catalog", PUBLIC, async ({ query }) =>
      businessRulesService.getCatalog(query.get("marketCode") || "FR"),
    );
    this.addRoute(
      "GET",
      "/monetization/professional-plans",
      PUBLIC,
      async ({ query }) =>
        businessRulesService.getProfessionalPlanCatalog(
          query.get("marketCode") || "FR",
        ),
    );
    this.addRoute(
      "POST",
      "/business-rules/eligibility",
      AUTHENTICATED,
      async ({ principal, body }) =>
        businessRulesService.getAccountEligibility(principal.userId, body),
    );
    this.addRoute(
      "POST",
      "/monetization/quotes",
      AUTHENTICATED,
      async ({ principal, body }) =>
        businessRulesService.createQuote(principal.userId, body),
    );
    this.addRoute(
      "POST",
      "/monetization/trials",
      permission("subscription.manage.own"),
      async ({ principal, body }) =>
        businessRulesService.createTrialQuote(principal.userId, body),
    );
    this.addRoute(
      "POST",
      "/monetization/checkouts",
      AUTHENTICATED,
      async ({ principal, body }) =>
        businessRulesService.createCheckout(
          principal.userId,
          body?.quoteId,
          body?.idempotencyKey,
        ),
    );
    this.addRoute(
      "POST",
      "/monetization/promotions/validate",
      AUTHENTICATED,
      async ({ principal, body }) =>
        businessRulesService.validatePromotion(principal.userId, body),
    );
    this.addRoute(
      "GET",
      "/monetization/entitlements",
      AUTHENTICATED,
      async ({ principal }) =>
        businessRulesService.getActiveEntitlements(principal.userId),
    );
    this.addRoute(
      "GET",
      "/monetization/subscriptions",
      AUTHENTICATED,
      async ({ principal }) =>
        businessRulesService.getSubscriptions(principal.userId),
    );
    this.addRoute(
      "GET",
      "/monetization/billing",
      AUTHENTICATED,
      async ({ principal }) =>
        businessRulesService.getBillingOverview(principal.userId),
    );

    // ------------------------------------------------------------------------
    // FINANCE & REVENUE ROUTES
    // Platform aggregation is never computed in the browser. Account routes
    // derive their scope from the authenticated principal; caller-supplied
    // account or organization ids are intentionally absent.
    // ------------------------------------------------------------------------
    this.addRoute(
      "GET",
      "/finance/account/overview",
      permission("finance.account.read.own"),
      async ({ principal }) =>
        financeService.getAccountDashboard(principal.userId),
    );
    this.addRoute(
      "GET",
      "/finance/organization/overview",
      permission("finance.organization.read.own"),
      async ({ principal }) =>
        financeService.getOrganizationDashboard(principal.userId),
    );
    this.addRoute(
      "GET",
      "/finance/platform/overview",
      permission("finance.platform.read"),
      async ({ query }) =>
        financeService.getPlatformDashboard({
          period: query.get("period") ?? undefined,
          marketCode: query.get("marketCode") ?? undefined,
          currency: query.get("currency") ?? undefined,
        } as any),
    );
    this.addRoute(
      "GET",
      "/finance/platform/transactions",
      permission("finance.transactions.read"),
      async ({ query }) =>
        financeService.listTransactions({
          period: query.get("period") ?? undefined,
          marketCode: query.get("marketCode") ?? undefined,
          currency: query.get("currency") ?? undefined,
          query: query.get("query") ?? undefined,
          status: (query.get("status") ?? undefined) as any,
          needsReviewOnly: query.get("needsReviewOnly") === "true",
          cursor: query.get("cursor") ?? undefined,
          limit: query.get("limit") ? Number(query.get("limit")) : undefined,
        } as any),
    );
    this.addRoute(
      "GET",
      "/finance/platform/transactions/:id",
      permission("finance.transactions.read"),
      async ({ params }) => financeService.getTransaction(params.id),
    );
    this.addRoute(
      "GET",
      "/finance/platform/reconciliation",
      permission("finance.reconciliation.manage"),
      async () => financeService.listReconciliationCases(),
    );
    this.addRoute(
      "GET",
      "/finance/platform/exports/transactions",
      permission("finance.exports.read"),
      async ({ query }) =>
        financeService.exportTransactions({
          period: query.get("period") ?? undefined,
          marketCode: query.get("marketCode") ?? undefined,
          currency: query.get("currency") ?? undefined,
          query: query.get("query") ?? undefined,
          status: (query.get("status") ?? undefined) as any,
          needsReviewOnly: query.get("needsReviewOnly") === "true",
        } as any),
    );
    this.addRoute(
      "GET",
      "/monetization/invoices/:id/document",
      AUTHENTICATED,
      async ({ principal, params }) =>
        businessRulesService.getInvoiceDocument(principal.userId, params.id),
    );
    this.addRoute(
      "POST",
      "/monetization/subscriptions/:id/change-preview",
      permission("subscription.manage.own"),
      async ({ principal, params, body }) =>
        businessRulesService.previewSubscriptionChange(principal.userId, {
          ...body,
          subscriptionId: params.id,
        }),
    );
    this.addRoute(
      "POST",
      "/monetization/subscriptions/:id/change",
      permission("subscription.manage.own"),
      async ({ principal, params, body }) =>
        businessRulesService.applySubscriptionChange(principal.userId, {
          ...body,
          subscriptionId: params.id,
        }),
    );
    this.addRoute(
      "PATCH",
      "/monetization/subscriptions/:id",
      permission("subscription.manage.own"),
      async ({ principal, params, body }) =>
        businessRulesService.updateSubscriptionCancellation(principal.userId, {
          subscriptionId: params.id,
          cancelAtPeriodEnd: body?.cancelAtPeriodEnd,
        }),
    );
    this.addRoute(
      "GET",
      "/admin/business-rules",
      permission("commercial_rules.read"),
      async ({ query }) =>
        businessRulesService.getAdminOverview(query.get("marketCode") || "FR"),
    );
    this.addRoute(
      "POST",
      "/admin/business-rules/simulate",
      permission("commercial_rules.read"),
      async ({ body }) => businessRulesService.evaluate(body),
    );
    this.addRoute(
      "POST",
      "/admin/commissions/simulate",
      permission("commissions.simulate"),
      async ({ body }) => commissionService.preview(body),
    );
    this.addRoute(
      "GET",
      "/admin/commissions/calculations/:id",
      permission("commissions.read"),
      async ({ params }) => commissionService.getCalculation(params.id),
    );
    this.addRoute(
      "POST",
      "/admin/commissions/calculations/:id/reversals",
      permission("commissions.manage"),
      async ({ params, body }) => commissionService.reverse(params.id, body),
    );
    this.addRoute(
      "GET",
      "/admin/commissions/analytics",
      permission("commissions.analytics.read"),
      async ({ query }) =>
        commissionService.listAnalytics({
          marketCode: query.get("marketCode") || "ALL",
          currency: query.get("currency") || "EUR",
          from: query.get("from"),
          to: query.get("to"),
          verticalId: query.get("verticalId") || undefined,
          categoryId: query.get("categoryId") || undefined,
          planId: query.get("planId") || undefined,
        } as any),
    );
    this.addRoute(
      "POST",
      "/admin/commissions/drafts",
      permission("commissions.manage"),
      async ({ principal, body }) => {
        const containsAccountOverride = (body?.commissionPolicies || []).some(
          (policy: any) =>
            (policy.rules || []).some(
              (rule: any) =>
                (rule.scope?.accountIds?.length || 0) > 0 ||
                (rule.scope?.organizationIds?.length || 0) > 0,
            ),
        );
        if (containsAccountOverride) {
          requirePermission(principal, "commissions.override_account");
        }
        return businessRulesService.createDraft(principal.userId, body);
      },
    );
    this.addRoute(
      "POST",
      "/admin/commissions/versions/:id/submit",
      permission("commissions.manage"),
      async ({ principal, params, body }) =>
        businessRulesService.transitionVersion({
          versionId: params.id,
          action: "submit",
          actorId: principal.userId,
          reason: body?.reason,
        }),
    );
    this.addRoute(
      "POST",
      "/admin/commissions/versions/:id/approve",
      permission("commissions.publish"),
      async ({ principal, params, body }) =>
        businessRulesService.transitionVersion({
          versionId: params.id,
          action: "approve",
          actorId: principal.userId,
          reason: body?.reason,
        }),
    );
    this.addRoute(
      "POST",
      "/admin/commissions/versions/:id/publish",
      permission("commissions.publish"),
      async ({ principal, params, body }) =>
        businessRulesService.transitionVersion({
          versionId: params.id,
          action: "publish",
          actorId: principal.userId,
          reason: body?.reason,
        }),
    );
    this.addRoute(
      "GET",
      "/admin/discovery/configuration",
      permission("commercial_rules.read"),
      async ({ query }) =>
        unifiedDiscoveryService.getEffectiveConfiguration(
          query.get("marketCode") || "FR",
          query.get("categoryId") || undefined,
          (query.get("context") || "search") as any,
        ),
    );
    this.addRoute(
      "POST",
      "/admin/discovery/explain",
      permission("commercial_rules.read"),
      async ({ body }) =>
        unifiedDiscoveryService.explainListing(
          body?.listingId,
          body?.filters || {},
        ),
    );
    this.addRoute(
      "GET",
      "/admin/discovery/metrics",
      permission("commercial_rules.read"),
      async ({ query }) =>
        unifiedDiscoveryService.getMetrics(
          query.get("marketCode") || "FR",
          query.get("since") || undefined,
        ),
    );
    this.addRoute(
      "POST",
      "/admin/discovery/configuration/drafts",
      permission("commercial_rules.edit"),
      async ({ principal, body }) =>
        unifiedDiscoveryService.saveConfigurationVersion(body?.configuration, {
          actorUserId: principal.userId,
          changeReason: body?.changeReason,
          activate: false,
        }),
    );
    this.addRoute(
      "POST",
      "/admin/discovery/configuration/publish",
      permission("commercial_rules.publish"),
      async ({ principal, body }) =>
        unifiedDiscoveryService.saveConfigurationVersion(body?.configuration, {
          actorUserId: principal.userId,
          changeReason: body?.changeReason,
          activate: true,
        }),
    );
    this.addRoute(
      "POST",
      "/admin/business-rules/drafts",
      permission("commercial_rules.edit"),
      async ({ principal, body }) =>
        businessRulesService.createDraft(principal.userId, body),
    );
    this.addRoute(
      "POST",
      "/admin/monetization/complimentary-grants/requests",
      permission("monetization.complimentary_grants.request"),
      async ({ principal, body }) =>
        businessRulesService.requestComplimentaryGrant(principal.userId, body),
    );
    this.addRoute(
      "POST",
      "/admin/monetization/complimentary-grants/requests/:id/decision",
      permission("monetization.complimentary_grants.create"),
      async ({ principal, params, body }) =>
        businessRulesService.decideComplimentaryGrant(
          principal.userId,
          params.id,
          body,
        ),
    );
    this.addRoute(
      "POST",
      "/admin/business-rules/versions/:id/submit",
      permission("commercial_rules.edit"),
      async ({ principal, params, body }) =>
        businessRulesService.transitionVersion({
          versionId: params.id,
          action: "submit",
          actorId: principal.userId,
          reason: body?.reason,
        }),
    );
    this.addRoute(
      "POST",
      "/admin/business-rules/versions/:id/approve",
      permission("commercial_rules.approve"),
      async ({ principal, params, body }) =>
        businessRulesService.transitionVersion({
          versionId: params.id,
          action: "approve",
          actorId: principal.userId,
          reason: body?.reason,
        }),
    );
    this.addRoute(
      "POST",
      "/admin/business-rules/versions/:id/publish",
      permission("commercial_rules.publish"),
      async ({ principal, params, body }) =>
        businessRulesService.transitionVersion({
          versionId: params.id,
          action: "publish",
          actorId: principal.userId,
          reason: body?.reason,
        }),
    );
    this.addRoute(
      "POST",
      "/admin/business-rules/versions/:id/rollback",
      permission("commercial_rules.publish"),
      async ({ principal, params, body }) =>
        businessRulesService.transitionVersion({
          versionId: params.id,
          action: "rollback",
          actorId: principal.userId,
          reason: body?.reason,
        }),
    );
    this.addRoute("GET", "/promotions/boosts", PUBLIC, async ({ query }) =>
      monetizationService.getAvailableBoosts(
        query.get("listingId") || undefined,
      ),
    );
    this.addRoute("GET", "/promotions/pro-plans", PUBLIC, async () =>
      monetizationService.getProSubscriptionPlans(),
    );
    this.addRoute(
      "POST",
      "/promotions/apply-boost",
      permission("listing.promote"),
      async ({ principal, body }) => {
        await this.assertListingOwnership(principal, body?.listingId);
        return monetizationService.beginProductCheckout({
          accountId: principal.userId,
          listingId: body?.listingId,
          productId: body?.boostId,
          idempotencyKey: body?.idempotencyKey,
        });
      },
    );
    this.addRoute(
      "POST",
      "/promotions/subscribe-pro",
      permission("subscription.manage.own"),
      async ({ principal, body }) =>
        monetizationService.beginProductCheckout({
          accountId: principal.userId,
          productId: body?.planId,
          idempotencyKey: body?.idempotencyKey,
        }),
    );

    // --------------------------------------------------------------------------
    // VERIFICATION & KYC/KYB ROUTES
    // --------------------------------------------------------------------------
    this.addRoute(
      "POST",
      "/compliance/requirements",
      AUTHENTICATED,
      async ({ principal, body }) =>
        complianceService.evaluateForUser(principal.userId, body),
    );
    this.addRoute(
      "GET",
      "/compliance/status",
      AUTHENTICATED,
      async ({ principal }) => {
        const subject = await complianceService.getSubject(principal.userId);
        return {
          ...subject,
          verification: Object.fromEntries(
            Object.entries(subject.verification).map(([dimension, record]) => [
              dimension,
              record
                ? {
                    dimension: record.dimension,
                    state: record.state,
                    method: record.method,
                    verifiedAt: record.verifiedAt,
                    expiresAt: record.expiresAt,
                    refreshRequiredAt: record.refreshRequiredAt,
                    reasonCode: record.reasonCode,
                    visibility: record.visibility,
                  }
                : record,
            ]),
          ),
        };
      },
    );
    this.addRoute(
      "POST",
      "/compliance/identity/session",
      AUTHENTICATED,
      async ({ principal, body }) =>
        complianceService.startIdentitySession({
          userId: principal.userId,
          dimension: body?.dimension || "identity",
          jurisdiction: body?.jurisdiction || "FR",
          returnUrl: complianceReturnUrl(body?.returnTo),
        }),
    );
    this.addRoute(
      "POST",
      "/compliance/payment/onboarding",
      AUTHENTICATED,
      async ({ principal, body }) =>
        complianceService.startPaymentOnboarding({
          userId: principal.userId,
          jurisdiction: body?.jurisdiction || "FR",
          returnUrl: complianceReturnUrl(body?.returnTo),
        }),
    );
    this.addRoute(
      "POST",
      "/compliance/manual-review",
      AUTHENTICATED,
      async ({ principal, body }) =>
        complianceService.requestManualReviewForUser({
          userId: principal.userId,
          dimension: body?.dimension,
        }),
    );
    this.addRoute(
      "GET",
      "/verification/status/:userId",
      AUTHENTICATED,
      async ({ principal, params }) =>
        verificationService.getUserVerificationStatus(
          resolveOwnerId(principal, params.userId, "user.read"),
        ),
    );
    this.addRoute(
      "GET",
      "/verification/siret-lookup/:siret",
      AUTHENTICATED,
      async ({ params }) =>
        verificationService.lookupCompanyBySiret(params.siret),
    );
    this.addRoute(
      "POST",
      "/verification/business-registration",
      AUTHENTICATED,
      async ({ principal, body }) =>
        verificationService.submitBusinessRegistration(
          principal.userId,
          body?.siret,
        ),
    );
    // --------------------------------------------------------------------------
    // MESSAGING ROUTES
    // --------------------------------------------------------------------------
    this.addRoute(
      "GET",
      "/messaging/conversations/:userId",
      permission("message.read.own"),
      async ({ principal, params }) =>
        messagingService.getUserConversations(
          resolveOwnerId(principal, params.userId),
        ),
    );
    this.addRoute(
      "GET",
      "/messaging/conversations/detail/:id",
      permission("message.read.own"),
      async ({ principal, params }) => {
        const conversation = await messagingService.getConversationById(
          params.id,
        );
        return this.assertConversationParticipant(principal, conversation);
      },
    );
    this.addRoute(
      "POST",
      "/messaging/send",
      permission("message.send"),
      async ({ principal, body }) => {
        await this.assertConversationAccess(principal, body?.conversationId);
        return messagingService.sendMessage({
          ...body,
          senderId: principal.userId,
        });
      },
    );
    this.addRoute(
      "POST",
      "/messaging/offer",
      permission("message.send"),
      async ({ principal, body }) => {
        await this.assertConversationAccess(principal, body?.conversationId);
        return messagingService.makeOffer(
          body?.conversationId,
          principal.userId,
          body?.senderName,
          body?.amount,
        );
      },
    );
    this.addRoute(
      "POST",
      "/messaging/offer-response",
      permission("message.send"),
      async ({ principal, body }) => {
        await this.assertConversationAccess(principal, body?.conversationId);
        return messagingService.respondToOffer(
          body?.conversationId,
          principal.userId,
          body?.userName,
          body?.accept,
        );
      },
    );
    this.addRoute(
      "POST",
      "/messaging/schedule-pickup",
      permission("message.send"),
      async ({ principal, body }) => {
        await this.assertConversationAccess(principal, body?.conversationId);
        return messagingService.schedulePickup(
          body?.conversationId,
          body?.date,
          body?.timeSlot,
          body?.address,
        );
      },
    );
    this.addRoute(
      "POST",
      "/messaging/read",
      permission("message.read.own"),
      async ({ principal, body }) => {
        await this.assertConversationAccess(principal, body?.conversationId);
        await messagingService.markAsRead(
          body?.conversationId,
          principal.userId,
        );
        return { success: true };
      },
    );
    this.addRoute(
      "POST",
      "/messaging/block",
      AUTHENTICATED,
      async ({ principal, body }) => {
        await messagingService.blockUser(principal.userId, body?.targetUserId);
        return { success: true };
      },
    );
    this.addRoute(
      "POST",
      "/messaging/unblock",
      AUTHENTICATED,
      async ({ principal, body }) => {
        await messagingService.unblockUser(
          principal.userId,
          body?.targetUserId,
        );
        return { success: true };
      },
    );

    // --------------------------------------------------------------------------
    // NOTIFICATIONS ROUTES
    // --------------------------------------------------------------------------
    this.addRoute(
      "GET",
      "/notifications/:userId",
      AUTHENTICATED,
      async ({ principal, params }) =>
        notificationsService.getUserNotifications(
          resolveOwnerId(principal, params.userId),
        ),
    );
    this.addRoute(
      "GET",
      "/notifications/unread-count/:userId",
      AUTHENTICATED,
      async ({ principal, params }) => {
        const count = await notificationsService.getUnreadCount(
          resolveOwnerId(principal, params.userId),
        );
        return { count };
      },
    );
    this.addRoute(
      "POST",
      "/notifications/:id/read",
      AUTHENTICATED,
      async ({ principal, params }) => {
        await this.assertNotificationOwnership(principal, params.id);
        await notificationsService.markAsRead(params.id);
        return { success: true };
      },
    );
    this.addRoute(
      "POST",
      "/notifications/:userId/read-all",
      AUTHENTICATED,
      async ({ principal, params }) => {
        await notificationsService.markAllAsRead(
          resolveOwnerId(principal, params.userId),
        );
        return { success: true };
      },
    );
    this.addRoute(
      "DELETE",
      "/notifications/:id",
      AUTHENTICATED,
      async ({ principal, params }) => {
        await this.assertNotificationOwnership(principal, params.id);
        await notificationsService.deleteNotification(params.id);
        return { success: true };
      },
    );
    this.addRoute(
      "POST",
      "/notifications/devices",
      AUTHENTICATED,
      async ({ principal, body }) => {
        await notificationsService.registerDevice(
          principal.userId,
          body?.token,
          body?.platform,
          body?.appVersion,
        );
        return { success: true };
      },
    );
    this.addRoute(
      "POST",
      "/notifications/devices/unregister",
      AUTHENTICATED,
      async ({ principal, body }) => {
        await notificationsService.unregisterDevice(
          principal.userId,
          body?.token,
        );
        return { success: true };
      },
    );

    // --------------------------------------------------------------------------
    // REVIEWS ROUTES
    // --------------------------------------------------------------------------
    // Ratings are shown on public seller pages, so reading them is public.
    this.addRoute("GET", "/reviews/user/:userId", PUBLIC, async ({ params }) =>
      reviewsService.getUserReviews(params.userId),
    );
    this.addRoute(
      "POST",
      "/reviews/submit",
      permission("review.create"),
      async ({ principal, body }) =>
        reviewsService.submitReview({ ...body, authorId: principal.userId }),
    );
    this.addRoute(
      "POST",
      "/reports",
      permission("report.create"),
      async ({ principal, body }) =>
        adminService.submitReport({ ...body, reporterId: principal.userId }),
    );

    // --------------------------------------------------------------------------
    // WORKSPACE & SELLER DASHBOARD ROUTES
    // --------------------------------------------------------------------------
    this.addRoute(
      "GET",
      "/workspace/summary/:userId",
      AUTHENTICATED,
      async ({ principal, params }) =>
        workspaceService.getUserWorkspaceSummary(
          resolveOwnerId(principal, params.userId),
        ),
    );
    this.addRoute(
      "GET",
      "/workspace/pro-analytics/:sellerId",
      permission("store.manage.own"),
      async ({ principal, params }) =>
        workspaceService.getProAnalytics(
          resolveOwnerId(principal, params.sellerId, "user.read"),
        ),
    );

    // --------------------------------------------------------------------------
    // ADMIN ROUTES
    // --------------------------------------------------------------------------
    this.addRoute(
      "GET",
      "/admin/providers/control-plane",
      permission("provider.read"),
      async () => providerControlPlaneService.getSnapshot(),
    );
    this.addRoute(
      "POST",
      "/admin/providers/:providerId/test",
      permission("provider.test"),
      async ({ params }) =>
        providerControlPlaneService.testProvider(params.providerId),
    );
    this.addRoute(
      "GET",
      "/admin/stats",
      permission("admin.configuration.manage"),
      async () => adminService.getPlatformStats(),
    );
    this.addRoute("GET", "/admin/users", permission("user.read"), async () =>
      adminService.getAllUsers(),
    );
    this.addRoute(
      "PUT",
      "/admin/users/:userId/status",
      permission("user.read"),
      async ({ principal, params, body }) => {
        if (params.userId === principal.userId) {
          throw new AppError({
            code: "BAD_REQUEST",
            message:
              "Vous ne pouvez pas modifier le statut de votre propre compte.",
          });
        }
        if (body?.status === "active") {
          requirePermission(principal, "user.reactivate");
        } else if (body?.status === "restricted") {
          requirePermission(principal, "compliance.restrict_account");
        } else {
          requirePermission(principal, "user.suspend");
        }
        return adminService.updateUserStatus({
          userId: params.userId,
          status: body?.status,
          reason: body?.reason,
          actor: principal,
        });
      },
    );
    this.addRoute(
      "PUT",
      "/admin/users/:userId/verification",
      permission("user.verify"),
      async ({ principal, params, body }) =>
        adminService.reviewProfessionalVerification({
          userId: params.userId,
          approve: body?.approve === true,
          notes: body?.notes,
          actor: principal,
        }),
    );
    this.addRoute(
      "GET",
      "/admin/compliance/rules",
      permission("compliance.policy.read"),
      async () => complianceService.listRules(),
    );
    this.addRoute(
      "PUT",
      "/admin/compliance/rules/:ruleId",
      permission("compliance.policy.manage"),
      async ({ principal, params, body }) => {
        if (body?.rule?.id !== params.ruleId)
          throw new AppError({
            code: "VALIDATION_ERROR",
            message: "L'identifiant de la règle ne correspond pas à la route.",
          });
        return complianceService.saveRule({
          rule: body.rule,
          actorId: principal.userId,
          reason: body?.reason,
        });
      },
    );
    this.addRoute(
      "GET",
      "/admin/compliance/audit",
      permission("compliance.audit.read"),
      async ({ query }) =>
        (
          await complianceService.listAuditEvents(
            Number(query.get("limit") || 100),
          )
        ).map(({ providerReference: _providerReference, ...event }) => event),
    );
    this.addRoute(
      "POST",
      "/admin/compliance/retention/run",
      permission("compliance.retention.manage"),
      async ({ principal }) =>
        complianceService.runApprovedRetention(principal.userId),
    );
    this.addRoute(
      "GET",
      "/admin/compliance/users/:userId/status",
      permission("compliance.sensitive.read"),
      async ({ params }) => complianceService.getSubject(params.userId),
    );
    this.addRoute(
      "POST",
      "/admin/compliance/users/:userId/requirements",
      permission("compliance.review"),
      async ({ params, body }) =>
        complianceService.evaluateForUser(params.userId, body),
    );
    this.addRoute(
      "GET",
      "/admin/compliance/reviews",
      permission("compliance.review"),
      async ({ query }) =>
        complianceService.listManualReviews(
          (query.get("state") || undefined) as any,
        ),
    );
    this.addRoute(
      "POST",
      "/admin/compliance/reviews/:caseId/decision",
      permission("compliance.review"),
      async ({ principal, params, body }) =>
        complianceService.decideManualReview({
          caseId: params.caseId,
          state: body?.state,
          reviewerId: principal.userId,
          reason: body?.reason,
        }),
    );
    this.addRoute(
      "GET",
      "/admin/reports",
      permission("report.review"),
      async () => adminService.getPendingReports(),
    );
    this.addRoute(
      "POST",
      "/admin/reports/:reportId/resolve",
      permission("report.review"),
      async ({ principal, params, body }) => {
        if (body?.action === "ban_user") {
          requirePermission(principal, "user.suspend");
        } else if (body?.action === "remove_listing") {
          requirePermission(principal, "moderation.action");
        }
        await adminService.resolveReport({
          reportId: params.reportId,
          action: body?.action,
          reason: body?.reason,
          actor: principal,
        });
        return { success: true };
      },
    );
    this.addRoute(
      "GET",
      "/admin/audit-logs",
      permission("audit.read"),
      async () => adminService.getAuditLogs(),
    );
    this.addRoute(
      "GET",
      "/admin/trending/config",
      permission("admin.configuration.manage"),
      async ({ query }) =>
        trendingService.getConfig(
          query.get("market") || query.get("country") || "FR",
        ),
    );
    this.addRoute(
      "PUT",
      "/admin/trending/config",
      permission("admin.configuration.manage"),
      async ({ body, query }) => {
        const marketCode = query.get("market") || body?.marketCode || "FR";
        return trendingService.saveConfig(
          marketCode,
          sanitizeTrendingConfigPatch(body),
        );
      },
    );
    this.addRoute(
      "PUT",
      "/admin/trending/overrides/:topicKey",
      permission("admin.configuration.manage"),
      async ({ params, body, query }) =>
        trendingService.upsertOverride(
          query.get("market") || body?.marketCode || "FR",
          {
            ...sanitizeTrendingOverride(body),
            topicKey: params.topicKey,
          },
        ),
    );

    // --------------------------------------------------------------------------
    // WEBHOOKS
    // --------------------------------------------------------------------------
    // Public by necessity — Stripe cannot present a session token. Authenticity
    // comes from the signature over the raw body instead, verified below.
    this.addRoute("POST", "/webhooks/stripe", PUBLIC, async ({ req, body }) => {
      const signature = req.headers["stripe-signature"];
      const rawBody = (req as any).rawBody as string | undefined;

      if (!config.stripeWebhookSecret) {
        // Refuse rather than accept unverifiable events: a webhook that is
        // trusted without verification is an unauthenticated write endpoint
        // into payment state.
        logger.error(
          "Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not configured",
        );
        throw new AppError({
          code: "FORBIDDEN",
          message: "Webhook non configuré.",
        });
      }

      const verified = verifyStripeSignature({
        payload: rawBody ?? "",
        signatureHeader: Array.isArray(signature) ? signature[0] : signature,
        secret: config.stripeWebhookSecret,
      });

      if (!verified.ok) {
        logger.warn(`Stripe webhook rejected: ${verified.reason}`);
        throw new AppError({
          code: "FORBIDDEN",
          message: "Signature de webhook invalide.",
        });
      }

      const auto = await autoService.handleProviderWebhook(
        "stripe",
        body,
        rawBody ?? "",
      );
      const realEstate = await realEstateService.handleProviderWebhook(
        "stripe",
        body,
        rawBody ?? "",
      );
      const monetization = await businessRulesService.handleStripeWebhook(
        body,
        rawBody ?? "",
      );
      logger.info(`Stripe webhook accepted: ${body?.type || "unknown event"}`);
      return { received: true, auto, realEstate, monetization };
    });
    this.addRoute(
      "POST",
      "/webhooks/compliance/:provider",
      PUBLIC,
      async ({ req, params, body }) => {
        if (params.provider !== "identity" && params.provider !== "payment")
          throw new AppError({
            code: "NOT_FOUND",
            message: "Provider inconnu.",
          });
        const rawBody = ((req as any).rawBody as string | undefined) ?? "";
        const signature = req.headers["x-shongre-signature"];
        const verified = verifyComplianceWebhookSignature({
          rawBody,
          signatureHeader: Array.isArray(signature) ? signature[0] : signature,
          secret: config.complianceWebhookSecret || "",
        });
        if (!verified.ok) {
          logger.warn(`Compliance webhook rejected: ${verified.reason}`);
          throw new AppError({
            code: "FORBIDDEN",
            message: "Signature de webhook invalide.",
          });
        }
        return complianceService.handleProviderWebhook({
          provider: params.provider,
          payload: body,
          rawBody,
        });
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Ownership helpers
  //
  // These live on the router rather than inside each service because the
  // services are also used by workers and jobs that legitimately act without a
  // principal. The HTTP edge is where a caller exists to be checked.
  // ---------------------------------------------------------------------------

  private async assertListingOwnership(
    principal: Principal,
    listingId: string | undefined,
  ): Promise<void> {
    if (!listingId) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Identifiant d’annonce manquant.",
      });
    }
    const listing = await listingsService.getListingById(listingId);
    if (!listing) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Annonce introuvable.",
      });
    }
    if (
      await publisherEntitlementsService.canManageListing(
        principal.userId,
        listing,
      )
    ) {
      return;
    }
    requireOwnership(principal, listing.sellerId, "listing.moderate");
  }

  private assertOrderParticipant<
    T extends { buyerId: string; sellerId: string } | null,
  >(principal: Principal, order: T): T {
    if (!order) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Commande introuvable.",
      });
    }
    if (
      order.buyerId !== principal.userId &&
      order.sellerId !== principal.userId &&
      !hasStaffOverride(principal, "order.refund")
    ) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Commande introuvable.",
      });
    }
    return order;
  }

  private assertConversationParticipant<
    T extends { buyerId: string; sellerId: string } | null,
  >(principal: Principal, conversation: T): T {
    if (!conversation) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Conversation introuvable.",
      });
    }
    // No staff override: private correspondence is not a moderation surface by
    // default. Reading a reported thread should go through a moderation case
    // that records who looked and why.
    if (
      conversation.buyerId !== principal.userId &&
      conversation.sellerId !== principal.userId
    ) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Conversation introuvable.",
      });
    }
    return conversation;
  }

  private async assertConversationAccess(
    principal: Principal,
    conversationId: string | undefined,
  ): Promise<void> {
    if (!conversationId) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Identifiant de conversation manquant.",
      });
    }
    const conversation =
      await messagingService.getConversationById(conversationId);
    this.assertConversationParticipant(principal, conversation);
  }

  private async assertNotificationOwnership(
    principal: Principal,
    notificationId: string,
  ): Promise<void> {
    const notification =
      await notificationsService.getNotificationById(notificationId);
    if (!notification) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Notification introuvable.",
      });
    }
    requireOwnership(principal, notification.userId);
  }

  // ---------------------------------------------------------------------------
  // Dispatch
  // ---------------------------------------------------------------------------

  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const rawUrl = req.url || "/";
    const parsedUrl = new URL(rawUrl, "http://request.invalid");
    let pathname = parsedUrl.pathname;

    if (pathname.startsWith("/api/v1")) {
      pathname = pathname.substring(7) || "/";
    }

    const method = (req.method || "GET").toUpperCase();

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = pathname.match(route.pattern);
      if (!match) continue;

      const params: Record<string, string> = {};
      route.paramNames.forEach((name, idx) => {
        params[name] = decodeURIComponent(match[idx + 1]);
      });

      let body: any = null;
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        body = await this.readRequestBody(req);
      }

      try {
        // Identity is resolved once per request, before the guard runs, so the
        // guard and the handler always agree on who the caller is.
        const principal = await this.resolvePrincipal(req);
        this.enforceAccess(route.access, principal);

        // Bearer-authenticated native clients are not vulnerable to browser
        // CSRF. Cookie-authenticated mutations are, so require the double-
        // submit token except for unauthenticated credential entry points and
        // provider callbacks (which are protected by OAuth state).
        const usesCookieSession =
          Boolean(accessCookie(req)) &&
          !extractBearerToken(req.headers.authorization);
        const csrfExempt =
          pathname === "/auth/login" ||
          pathname === "/auth/register" ||
          pathname === "/auth/refresh" ||
          pathname === "/auth/password/forgot" ||
          pathname === "/auth/password/reset" ||
          pathname === "/auth/verify-email" ||
          pathname === "/auth/verify-email/resend" ||
          pathname === "/auth/oauth/complete-profile" ||
          pathname === "/auth/oauth/native-exchange" ||
          /\/auth\/oauth\/[^/]+\/callback$/.test(pathname) ||
          (/\/auth\/oauth\/[^/]+\/start$/.test(pathname) &&
            body?.intent !== "link");
        if (
          usesCookieSession &&
          !["GET", "HEAD", "OPTIONS"].includes(method) &&
          !csrfExempt
        ) {
          requireCsrf(req);
        }

        const result = await route.handler({
          req,
          res,
          params,
          body,
          principal,
          query: parsedUrl.searchParams,
        });

        if (res.writableEnded) return;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result ?? null));
      } catch (err: any) {
        this.writeError(res, err, method, pathname);
      }
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: {
          code: "NOT_FOUND",
          message: `Route ${method} ${pathname} not found`,
          statusCode: 404,
        },
      }),
    );
  }

  private async resolvePrincipal(req: IncomingMessage): Promise<Principal> {
    const token =
      extractBearerToken(req.headers.authorization) || accessCookie(req);
    if (!token) return GUEST_PRINCIPAL;
    return authService.resolvePrincipal(token);
  }

  private enforceAccess(access: RouteAccess, principal: Principal): void {
    switch (access.kind) {
      case "public":
        return;
      case "authenticated":
        requireAuthenticated(principal);
        return;
      case "permission":
        requirePermission(principal, access.permission);
        return;
    }
  }

  private writeError(
    res: ServerResponse,
    err: any,
    method: string,
    pathname: string,
  ): void {
    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? err.statusCode : 500;

    if (!isAppError) {
      // Unexpected failures are logged in full but never returned: provider
      // errors and stack traces routinely carry connection strings and ids.
      logger.error(
        `Unhandled error on ${method} ${pathname}: ${err?.stack || err?.message || err}`,
      );
    }

    const payload = isAppError
      ? err.toJSON()
      : {
          error: {
            code: "INTERNAL_ERROR",
            message: "Une erreur interne est survenue.",
            statusCode: 500,
          },
        };

    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  }

  private readRequestBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        // The exact bytes are retained for signature verification: Stripe signs
        // the raw payload, and re-serializing parsed JSON does not reproduce it.
        (req as any).rawBody = data;
        if (!data.trim()) return resolve(null);
        const contentType = String(
          req.headers["content-type"] || "",
        ).toLowerCase();
        if (contentType.includes("application/x-www-form-urlencoded")) {
          return resolve(
            Object.fromEntries(new URLSearchParams(data).entries()),
          );
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
  }
}

function redirectResponse(res: ServerResponse, location: string): void {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.setHeader("Cache-Control", "no-store");
  res.end();
}

function complianceReturnUrl(returnTo: unknown): string {
  const safePath =
    typeof returnTo === "string" &&
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//")
      ? returnTo
      : "/compte/verification";
  return new URL(
    safePath,
    config.frontendUrl || "http://localhost:3000",
  ).toString();
}

/**
 * Fields a user may change about themselves.
 *
 * An allowlist rather than a blocklist: `updateUserProfile` writes what it is
 * given, so a passthrough body would let a caller PUT their own
 * `primaryRole: 'admin'`, `status: 'active'` past a suspension, or
 * `isIdentityVerified: true`. Those transitions belong to admin and
 * verification flows.
 */
function sanitizeProfileUpdate(
  body: any,
  _principal: Principal,
): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const allowed = [
    "name",
    "avatarUrl",
    "phone",
    "city",
    "postalCode",
    "department",
    "region",
    "country",
    "bio",
  ];
  const clean: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) clean[key] = body[key];
  }
  return clean;
}

function sanitizeTrendingConfigPatch(body: any): Partial<TrendingAdminConfig> {
  if (!body || typeof body !== "object") return {};
  const allowed = [
    "enabled",
    "maxTopics",
    "minTopics",
    "maxTopicsPerParentCategory",
    "minimumActivity",
    "displayPeriodDays",
    "cacheTtlMinutes",
    "personalizationWeight",
    "title",
    "subtitle",
    "mobileVisible",
    "desktopVisible",
    "excludedCategories",
    "excludedTopics",
    "weights",
  ] as const;
  const clean: Partial<TrendingAdminConfig> = {};
  for (const key of allowed) {
    if (body[key] !== undefined)
      (clean as Record<string, unknown>)[key] = body[key];
  }
  return clean;
}

function sanitizeTrendingOverride(body: any): TrendingTopicOverride {
  if (!body || typeof body !== "object") return { topicKey: "" };
  return {
    topicKey: "",
    topicType: body.topicType,
    isPinned: Boolean(body.isPinned),
    isHidden: Boolean(body.isHidden),
    boostScore:
      typeof body.boostScore === "number"
        ? Math.min(1, Math.max(0, body.boostScore))
        : 0,
    customTitle:
      typeof body.customTitle === "string" ? body.customTitle : undefined,
    customSubtitle:
      typeof body.customSubtitle === "string" ? body.customSubtitle : undefined,
    customImage: body.customImage,
    startsAt: typeof body.startsAt === "string" ? body.startsAt : undefined,
    endsAt: typeof body.endsAt === "string" ? body.endsAt : undefined,
    sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    region: typeof body.region === "string" ? body.region : undefined,
    city: typeof body.city === "string" ? body.city : undefined,
  };
}

function hasStaffOverride(principal: Principal, override: Permission): boolean {
  try {
    requirePermission(principal, override);
    return true;
  } catch {
    return false;
  }
}

export const apiV1Router = new ApiV1Router();
