import { IncomingMessage, ServerResponse } from "http";
import { ZodError } from "zod";
import { getCountryConfig } from "@shongre/contracts";
import {
  authService,
  usersService,
  marketsService,
  taxonomyService,
  listingsService,
  ordersService,
  paymentsService,
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
  providerConnectionService,
  aiService,
  supportService,
  featureFlagService,
  moderationService,
  crmService,
  crmShongreService,
  marketingService,
  marketingOperationsService,
  marketingTrackingService,
  marketingProviderWebhookService,
} from "../../modules/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { storageService } from "../../infrastructure/storage/storage-service.js";
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
import { OPENAPI_OPERATIONS } from "../../generated/openapi-manifest.js";
import {
  requireApiRequestMarket,
  requireOpenApiRequestMarket,
  requireOpenMarketplace,
  resolveApiRequestMarket,
} from "../../modules/markets/request-market-context.js";

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
  marketCode: string | null;
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
  path: string;
  pattern: RegExp;
  paramNames: string[];
  access: RouteAccess;
  handler: RouteHandler;
  operationId: string;
  requestBodyRequired: boolean;
  successStatus: number;
  queryParameters: Readonly<Record<string, string>>;
}

export class ApiV1Router {
  private routes: RouteDef[] = [];

  constructor() {
    this.registerRoutes();
    const registered = new Set(
      this.routes.map((route) => `${route.method} ${route.path}`),
    );
    const undocumentedImplementations = this.routes.filter(
      (route) =>
        !(OPENAPI_OPERATIONS as Readonly<Record<string, unknown>>)[
          `${route.method} ${route.path}`
        ],
    );
    const unimplementedOperations = Object.keys(OPENAPI_OPERATIONS).filter(
      (key) => !registered.has(key),
    );
    if (undocumentedImplementations.length || unimplementedOperations.length) {
      throw new Error(
        `OpenAPI/router divergence: undocumented=${undocumentedImplementations
          .map((route) => `${route.method} ${route.path}`)
          .join(",")}; unimplemented=${unimplementedOperations.join(",")}`,
      );
    }
  }

  private addRoute(
    method: string,
    path: string,
    access: RouteAccess,
    handler: RouteHandler,
  ) {
    const methodName = method.toUpperCase();
    const operation = (
      OPENAPI_OPERATIONS as Readonly<
        Record<
          string,
          {
            operationId: string;
            access: string;
            permission: string | null;
            requestBodyRequired: boolean;
            successStatus: number;
            queryParameters: Readonly<Record<string, string>>;
          }
        >
      >
    )[[methodName, path].join(" ")];
    if (!operation) {
      throw new Error(`Route ${methodName} ${path} is absent from OpenAPI.`);
    }
    const declaredAccess =
      access.kind === "permission" ? "permission" : access.kind;
    if (
      operation.access !== declaredAccess ||
      (access.kind === "permission" &&
        operation.permission !== access.permission)
    ) {
      throw new Error(
        `Route security diverges from OpenAPI for ${methodName} ${path}.`,
      );
    }
    const paramNames: string[] = [];
    const regexPath = path.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return "([^/]+)";
    });
    const pattern = new RegExp(`^${regexPath}$`);
    this.routes.push({
      method: method.toUpperCase(),
      path,
      pattern,
      paramNames,
      access,
      handler,
      operationId: operation.operationId,
      requestBodyRequired: operation.requestBodyRequired,
      successStatus: operation.successStatus,
      queryParameters: operation.queryParameters,
    });
  }

  /** Keeps the Education namespace explicit without registering aliases. */
  private addEducationRoute(
    method: string,
    path: string,
    access: RouteAccess,
    handler: RouteHandler,
  ) {
    this.addRoute(method, `/education${path}`, access, handler);
  }

  private registerRoutes() {
    // --------------------------------------------------------------------------
    // AUTH ROUTES
    // --------------------------------------------------------------------------
    this.addRoute("GET", "/auth/me", PUBLIC, async ({ principal }) =>
      authService.getCurrentUser(principal),
    );
    this.addRoute(
      "POST",
      "/auth/domain-handoff/start",
      AUTHENTICATED,
      async ({ principal, body, marketCode }) => {
        if (
          !marketCode ||
          marketCode !== String(body?.sourceCountry || "").toUpperCase()
        ) {
          throw new AppError({
            code: "CONFLICT",
            message:
              "Le marché source ne correspond pas à la session courante.",
          });
        }
        return authService.beginDomainHandoff(principal, body || {});
      },
    );
    this.addRoute(
      "POST",
      "/auth/domain-handoff/exchange",
      PUBLIC,
      async ({ body, req, res, marketCode }) => {
        const targetCountry = String(body?.targetCountry || "").toUpperCase();
        if (!marketCode || marketCode !== targetCountry) {
          throw new AppError({
            code: "CONFLICT",
            message: "Le code de transfert ne cible pas ce marché.",
          });
        }
        const result = await authService.exchangeDomainHandoff(
          body || {},
          requestMetadata(req),
        );
        setSessionCookies(res, result.tokens);
        return { user: result.user, returnTo: result.returnTo };
      },
    );
    this.addRoute("POST", "/auth/login", PUBLIC, async ({ body, req, res }) => {
      const result = await authService.login(body, requestMetadata(req));
      if ("requiresMfa" in result) return result;
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
      "/auth/mfa/challenge",
      PUBLIC,
      async ({ body, req, res }) => {
        const result = await authService.verifyMfaLogin(
          body?.tempMfaToken,
          body?.code,
          requestMetadata(req),
        );
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
    this.addRoute("GET", "/auth/mfa", AUTHENTICATED, async ({ principal }) =>
      authService.getMfaStatus(principal),
    );
    this.addRoute(
      "POST",
      "/auth/mfa/setup",
      AUTHENTICATED,
      async ({ principal }) => authService.beginMfaEnrollment(principal),
    );
    this.addRoute(
      "POST",
      "/auth/mfa/confirm",
      AUTHENTICATED,
      async ({ principal, body }) =>
        authService.confirmMfaEnrollment(principal, body?.code),
    );
    this.addRoute(
      "POST",
      "/auth/mfa/session-confirm",
      AUTHENTICATED,
      async ({ principal, body }) =>
        authService.verifySessionMfa(principal, body?.code),
    );
    this.addRoute(
      "DELETE",
      "/auth/mfa",
      AUTHENTICATED,
      async ({ principal, body }) =>
        authService.disableMfa(principal, body?.code),
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

      const frontendBase = config.frontendUrl;
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
    // AI ASSISTANCE ROUTES
    // --------------------------------------------------------------------------
    this.addRoute(
      "POST",
      "/ai/listing-assistance",
      permission("listing.create"),
      async ({ body }) => aiService.generateListingAssistance(body || {}),
    );
    this.addRoute(
      "POST",
      "/ai/listing-safety",
      permission("listing.create"),
      async ({ body }) => aiService.analyzeListingSafety(body || {}),
    );

    // --------------------------------------------------------------------------
    // USERS ROUTES
    // --------------------------------------------------------------------------
    // Public seller profiles are part of the marketplace surface.
    this.addRoute("GET", "/users/:id", PUBLIC, async ({ params }) =>
      usersService.getPublicUserById(params.id),
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
    this.addRoute("GET", "/listings", PUBLIC, async ({ query, marketCode }) => {
      const resolved = requireApiRequestMarket(marketCode);
      requireOpenMarketplace(resolved);
      const params = {
        ...Object.fromEntries(query.entries()),
        marketCode: resolved,
      };
      return listingsService.getListings(params as any);
    });
    this.addRoute(
      "GET",
      "/listings/:id",
      PUBLIC,
      async ({ params, marketCode }) => {
        const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
        return listingsService.getListingById(params.id, resolvedMarketCode);
      },
    );
    this.addRoute(
      "POST",
      "/listings/search",
      PUBLIC,
      async ({ body, marketCode }) => {
        const resolved = requireApiRequestMarket(marketCode);
        requireOpenMarketplace(resolved);
        return listingsService.searchListings({
          ...(body || {}),
          marketCode: resolved,
        });
      },
    );
    this.addRoute(
      "GET",
      "/home/trending",
      PUBLIC,
      async ({ query, marketCode }) =>
        trendingService.getSection({
          marketCode: requireOpenApiRequestMarket(marketCode),
          region: query.get("region") || undefined,
          city: query.get("city") || undefined,
          limit: query.get("limit") ? Number(query.get("limit")) : undefined,
        }),
    );
    this.addRoute(
      "GET",
      "/listing-drafts/current",
      permission("listing.create"),
      async ({ principal }) =>
        listingsService.getListingDraft(principal.userId),
    );
    this.addRoute(
      "POST",
      "/listing-drafts",
      permission("listing.create"),
      async ({ principal, marketCode }) =>
        listingsService.createListingDraft(
          principal.userId,
          requireApiRequestMarket(marketCode),
        ),
    );
    this.addRoute(
      "PUT",
      "/listing-drafts/current",
      permission("listing.create"),
      async ({ principal, body }) => {
        await listingsService.saveListingDraft(body, principal.userId);
        return { success: true };
      },
    );
    this.addRoute(
      "GET",
      "/listings/bulk-import/template",
      permission("listing.create"),
      async ({ query, marketCode }) => {
        const country = getCountryConfig(requireApiRequestMarket(marketCode))!;
        return listingsService.getBulkImportTemplate(
          query.get("locale") || country.defaultLocale,
        );
      },
    );
    this.addRoute(
      "POST",
      "/listings/bulk-import/parse",
      permission("listing.create"),
      async ({ body, marketCode }) =>
        listingsService.parseBulkImportCsv({
          ...(body || {}),
          marketCode: requireApiRequestMarket(marketCode),
        }),
    );
    this.addRoute(
      "POST",
      "/listings/bulk-import/publish",
      permission("listing.publish"),
      async ({ principal, body, marketCode }) =>
        listingsService.publishBulkListings(principal.userId, {
          ...(body || {}),
          marketCode: requireOpenApiRequestMarket(marketCode),
        }),
    );
    this.addRoute(
      "POST",
      "/media/listings/uploads",
      permission("listing.create"),
      async ({ principal, body }) =>
        storageService.createListingMediaUpload(principal.userId, body || {}),
    );
    this.addRoute(
      "POST",
      "/media/listings/uploads/:id/complete",
      permission("listing.create"),
      async ({ principal, params }) =>
        storageService.completeListingMediaUpload(principal.userId, params.id),
    );
    this.addRoute(
      "POST",
      "/media/private-documents/uploads",
      AUTHENTICATED,
      async ({ principal, body }) =>
        storageService.createPrivateDocumentUpload(
          principal.userId,
          body || {},
        ),
    );
    this.addRoute(
      "POST",
      "/media/private-documents/uploads/:id/complete",
      AUTHENTICATED,
      async ({ principal, params }) =>
        storageService.completePrivateDocumentUpload(
          principal.userId,
          params.id,
        ),
    );
    this.addRoute(
      "POST",
      "/listings/publish",
      permission("listing.publish"),
      async ({ principal, body, marketCode }) => {
        const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
        const subject = await complianceService.getSubject(principal.userId);
        await complianceService.requireForUser(principal.userId, {
          requestedAction:
            subject.accountType === "professional"
              ? "publish_professional_listing"
              : "publish_listing",
          jurisdiction: resolvedMarketCode,
          marketCode: resolvedMarketCode,
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
      async ({ principal, body, marketCode }) =>
        publisherEntitlementsService.getPublicationEntitlements({
          actorUserId: principal.userId,
          organizationId: body?.organizationId,
          branchId: body?.branchId,
          marketCode: requireApiRequestMarket(marketCode),
          categoryId: body?.categoryId,
        }),
    );
    this.addRoute(
      "PUT",
      "/listings/:id",
      permission("listing.update.own"),
      async ({ principal, params, body }) => {
        await this.assertListingOwnership(principal, params.id);
        return listingsService.updateSellerListing(params.id, body);
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
    this.addRoute(
      "GET",
      "/taxonomy/nodes/:id/children",
      PUBLIC,
      async ({ params }) => taxonomyService.getChildren(params.id),
    );
    this.addRoute(
      "GET",
      "/taxonomy/nodes/:id/attributes",
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
    this.addEducationRoute("GET", "/catalog", PUBLIC, async ({ marketCode }) =>
      coursesService.getCatalog(requireOpenApiRequestMarket(marketCode)),
    );
    this.addEducationRoute(
      "POST",
      "/search",
      PUBLIC,
      async ({ body, marketCode }) =>
        coursesService.searchTutors({
          ...(body || {}),
          marketCode: requireOpenApiRequestMarket(marketCode),
        }),
    );
    this.addEducationRoute(
      "GET",
      "/tutors/:id",
      PUBLIC,
      async ({ params, marketCode }) => {
        const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
        const profile = await coursesService.getTutorPublicProfile(params.id);
        if (
          profile.tutor.serviceArea?.marketCode !== resolvedMarketCode &&
          !profile.offers.some((offer) =>
            offer.marketCodes.includes(resolvedMarketCode),
          )
        )
          throw new AppError({
            code: "NOT_FOUND",
            message: "Profil professeur introuvable sur ce marché.",
          });
        return profile;
      },
    );
    this.addEducationRoute(
      "GET",
      "/favorites",
      AUTHENTICATED,
      async ({ principal }) => ({
        tutorProfileIds: await coursesService.getSavedTutorIds(
          principal.userId,
        ),
      }),
    );
    this.addEducationRoute(
      "POST",
      "/tutors/:id/favorite",
      AUTHENTICATED,
      async ({ principal, params }) => ({
        isFavorite: await coursesService.toggleSavedTutor(
          principal.userId,
          params.id,
        ),
      }),
    );
    this.addEducationRoute(
      "GET",
      "/workflow-drafts/tutor-onboarding",
      permission("course.profile.manage.own"),
      async ({ principal, marketCode }) =>
        coursesService.getTutorOnboardingDraft(
          principal.userId,
          requireApiRequestMarket(marketCode),
        ),
    );
    this.addEducationRoute(
      "PUT",
      "/workflow-drafts/tutor-onboarding",
      permission("course.profile.manage.own"),
      async ({ principal, body, marketCode }) => {
        await coursesService.saveWorkflowDraft(
          principal.userId,
          requireApiRequestMarket(marketCode),
          "tutor_onboarding",
          body?.draft,
        );
        return { success: true };
      },
    );
    this.addEducationRoute(
      "DELETE",
      "/workflow-drafts/tutor-onboarding",
      permission("course.profile.manage.own"),
      async ({ principal, marketCode }) => {
        await coursesService.deleteWorkflowDraft(
          principal.userId,
          requireApiRequestMarket(marketCode),
          "tutor_onboarding",
        );
        return { success: true };
      },
    );
    this.addEducationRoute(
      "POST",
      "/onboarding/submit",
      permission("course.profile.manage.own"),
      async ({ principal, body, marketCode }) =>
        coursesService.submitTutorOnboarding(
          principal.userId,
          requireApiRequestMarket(marketCode),
          body?.draft,
        ),
    );
    this.addEducationRoute(
      "GET",
      "/workflow-drafts/learner-request",
      permission("course.request.create"),
      async ({ principal, query, marketCode }) =>
        coursesService.getLearnerRequestDraft(
          principal.userId,
          requireApiRequestMarket(marketCode),
          query.get("subject") || "",
        ),
    );
    this.addEducationRoute(
      "PUT",
      "/workflow-drafts/learner-request",
      permission("course.request.create"),
      async ({ principal, body, marketCode }) => {
        await coursesService.saveWorkflowDraft(
          principal.userId,
          requireApiRequestMarket(marketCode),
          "learner_request",
          body?.draft,
        );
        return { success: true };
      },
    );
    this.addEducationRoute(
      "DELETE",
      "/workflow-drafts/learner-request",
      permission("course.request.create"),
      async ({ principal, marketCode }) => {
        await coursesService.deleteWorkflowDraft(
          principal.userId,
          requireApiRequestMarket(marketCode),
          "learner_request",
        );
        return { success: true };
      },
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
      "POST",
      "/organizations/:organizationId/members",
      permission("course.organization.manage.own"),
      async ({ principal, params, body }) =>
        coursesService.inviteOrganizationMember(
          principal.userId,
          params.organizationId,
          body || {},
        ),
    );
    this.addEducationRoute(
      "POST",
      "/organizations/:organizationId/locations",
      permission("course.organization.manage.own"),
      async ({ principal, params, body }) =>
        coursesService.addOrganizationLocation(
          principal.userId,
          params.organizationId,
          body || {},
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
      async ({ principal, body, marketCode }) =>
        coursesService.createBooking(
          principal.userId,
          requireApiRequestMarket(marketCode),
          body?.booking,
        ),
    );
    this.addEducationRoute(
      "GET",
      "/admin/catalog",
      permission("course.admin.manage"),
      async ({ marketCode }) =>
        coursesService.getAdminCatalog(requireApiRequestMarket(marketCode)),
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
    this.addRoute("GET", "/auto/catalog", PUBLIC, async ({ marketCode }) =>
      autoService.getCatalog(requireOpenApiRequestMarket(marketCode)),
    );
    this.addRoute(
      "POST",
      "/auto/search",
      PUBLIC,
      async ({ body, marketCode }) =>
        autoService.search({
          ...(body || {}),
          marketCode: requireOpenApiRequestMarket(marketCode),
        }),
    );
    this.addRoute(
      "GET",
      "/auto/vehicles/:id",
      PUBLIC,
      async ({ params, marketCode }) => {
        const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
        const vehicle = await autoService.getPublicVehicle(params.id);
        if (!vehicle.marketCodes.includes(resolvedMarketCode))
          throw new AppError({
            code: "NOT_FOUND",
            message: "Véhicule introuvable sur ce marché.",
          });
        return vehicle;
      },
    );
    this.addRoute(
      "GET",
      "/auto/favorites",
      AUTHENTICATED,
      async ({ principal }) => ({
        vehicleIds: await autoService.getFavoriteVehicleIds(principal.userId),
      }),
    );
    this.addRoute(
      "POST",
      "/auto/vehicles/:id/favorite",
      AUTHENTICATED,
      async ({ principal, params }) => ({
        isFavorite: await autoService.toggleFavoriteVehicle(
          principal.userId,
          params.id,
        ),
      }),
    );
    this.addRoute(
      "POST",
      "/auto/drafts",
      permission("auto.vehicle.manage.own"),
      async ({ principal, marketCode }) =>
        autoService.getOrCreateOwnDraft(
          principal.userId,
          requireApiRequestMarket(marketCode),
        ),
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
      async ({ marketCode }) =>
        autoService.getAdminOverview(requireApiRequestMarket(marketCode)),
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
    this.addRoute(
      "GET",
      "/real-estate/catalog",
      PUBLIC,
      async ({ marketCode }) =>
        realEstateService.getCatalog(requireOpenApiRequestMarket(marketCode)),
    );
    this.addRoute(
      "POST",
      "/real-estate/search",
      PUBLIC,
      async ({ body, marketCode }) =>
        realEstateService.search({
          ...(body || {}),
          marketCode: requireOpenApiRequestMarket(marketCode),
          sort: body?.sort || "relevance",
        }),
    );
    this.addRoute(
      "GET",
      "/real-estate/properties/:id",
      PUBLIC,
      async ({ params, marketCode }) => {
        const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
        const property = await realEstateService.getPublicProperty(params.id);
        if (!property.marketCodes.includes(resolvedMarketCode))
          throw new AppError({
            code: "NOT_FOUND",
            message: "Bien immobilier introuvable sur ce marché.",
          });
        return property;
      },
    );
    this.addRoute(
      "GET",
      "/real-estate/properties/:id/comparables",
      PUBLIC,
      async ({ params, marketCode }) => {
        const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
        const property = await realEstateService.getPublicProperty(params.id);
        if (!property.marketCodes.includes(resolvedMarketCode))
          throw new AppError({
            code: "NOT_FOUND",
            message: "Bien immobilier introuvable sur ce marché.",
          });
        return realEstateService.getComparableProperties(property.id);
      },
    );
    this.addRoute(
      "GET",
      "/real-estate/recently-viewed",
      AUTHENTICATED,
      async ({ principal, marketCode }) => {
        const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
        return (
          await realEstateService.getRecentlyViewed(principal.userId)
        ).filter((property) =>
          property.marketCodes.includes(resolvedMarketCode),
        );
      },
    );
    this.addRoute(
      "POST",
      "/real-estate/recently-viewed",
      AUTHENTICATED,
      async ({ principal, body }) =>
        realEstateService.markRecentlyViewed(
          principal.userId,
          body?.propertyId,
        ),
    );
    this.addRoute(
      "POST",
      "/real-estate/drafts",
      permission("immo.property.manage.own"),
      async ({ principal, marketCode }) =>
        realEstateService.getOrCreateOwnDraft(
          principal.userId,
          requireApiRequestMarket(marketCode),
        ),
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
      async ({ marketCode }) =>
        realEstateService.getAdminOverview(requireApiRequestMarket(marketCode)),
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
    this.addRoute(
      "GET",
      "/employment/catalog",
      PUBLIC,
      async ({ marketCode }) =>
        employmentService.getCatalog(requireOpenApiRequestMarket(marketCode)),
    );
    this.addRoute(
      "POST",
      "/employment/search",
      PUBLIC,
      async ({ body, marketCode }) =>
        employmentService.search({
          ...(body || {}),
          marketCode: requireOpenApiRequestMarket(marketCode),
        }),
    );
    this.addRoute(
      "GET",
      "/employment/jobs/:id",
      PUBLIC,
      async ({ params, marketCode }) => {
        const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
        const job = await employmentService.getPublicJob(params.id);
        if (job.marketCode !== resolvedMarketCode)
          throw new AppError({
            code: "NOT_FOUND",
            message: "Offre d’emploi introuvable sur ce marché.",
          });
        return job;
      },
    );
    this.addRoute(
      "GET",
      "/employment/jobs/:id/similar",
      PUBLIC,
      async ({ params, marketCode }) => {
        const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
        const job = await employmentService.getPublicJob(params.id);
        if (job.marketCode !== resolvedMarketCode)
          throw new AppError({
            code: "NOT_FOUND",
            message: "Offre d’emploi introuvable sur ce marché.",
          });
        return employmentService.getSimilarJobs(job.id);
      },
    );
    this.addRoute(
      "POST",
      "/employment/drafts",
      permission("employment.job.manage.own"),
      async ({ principal, body, marketCode }) =>
        employmentService.getOrCreateOwnDraft(
          principal.userId,
          requireApiRequestMarket(marketCode),
          body?.preferredDraftId,
        ),
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
      "PUT",
      "/employment/drafts/:id/publication",
      permission("employment.job.manage.own"),
      async ({ principal, params, body }) =>
        employmentService.saveOwnPublicationDraft(
          principal.userId,
          params.id,
          body,
        ),
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
      async ({ body, marketCode }) => ({
        flags: await employmentService.flagProhibitedLanguage(
          body?.content,
          requireApiRequestMarket(marketCode),
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
      async ({ marketCode }) =>
        employmentService.getAdminOverview(requireApiRequestMarket(marketCode)),
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
    this.addRoute(
      "PATCH",
      "/admin/countries/:code",
      permission("market.manage"),
      async ({ principal, params, body }) =>
        marketsService.updateCountryConfiguration(
          params.code,
          body,
          principal.userId,
        ),
    );

    // --------------------------------------------------------------------------
    // ORDERS & PAYMENT LIFECYCLE ROUTES
    // --------------------------------------------------------------------------
    this.addRoute(
      "GET",
      "/orders/purchases",
      permission("order.read.own"),
      async ({ principal }) => ordersService.getPurchases(principal.userId),
    );
    this.addRoute(
      "GET",
      "/orders/sales",
      permission("order.manage.seller"),
      async ({ principal }) => ordersService.getSales(principal.userId),
    );
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
      "POST",
      "/orders/direct-purchase/quote",
      permission("order.create"),
      async ({ principal, body }) =>
        ordersService.quoteDirectPurchase({
          listingId: body?.listingId,
          deliveryMethod: body?.deliveryMethod,
          buyerId: principal.userId,
        }),
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
      "/orders/:id/handover-code",
      AUTHENTICATED,
      async ({ principal, params }) =>
        ordersService.issueHandoverCode(params.id, principal.userId),
    );
    this.addRoute(
      "POST",
      "/orders/:id/confirm-pin",
      AUTHENTICATED,
      async ({ principal, params, body }) =>
        ordersService.confirmHandoverPIN(
          params.id,
          principal.userId,
          body?.pin,
        ),
    );
    this.addRoute(
      "POST",
      "/orders/:id/confirm-delivery",
      AUTHENTICATED,
      async ({ principal, params }) =>
        ordersService.confirmDeliveryReceived(params.id, principal.userId),
    );
    this.addRoute(
      "POST",
      "/orders/:id/ship",
      AUTHENTICATED,
      async ({ principal, params, body }) =>
        ordersService.markShipped(params.id, principal.userId, body),
    );
    this.addRoute(
      "POST",
      "/orders/:id/cancel",
      AUTHENTICATED,
      async ({ principal, params }) =>
        ordersService.cancelUnpaidOrder(params.id, principal.userId),
    );
    this.addRoute(
      "POST",
      "/orders/:id/dispute",
      AUTHENTICATED,
      async ({ principal, params, body }) =>
        ordersService.openDispute(
          params.id,
          principal.userId,
          body?.reason,
          body?.details,
        ),
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
      async ({ principal, body, marketCode }) => {
        const resolvedMarketCode = requireApiRequestMarket(marketCode);
        const country = getCountryConfig(resolvedMarketCode)!;
        const currency = String(body?.currency || "").toUpperCase();
        if (currency !== country.currency)
          throw new AppError({
            code: "VALIDATION_ERROR",
            message: "La devise ne correspond pas au marché sélectionné.",
          });
        await complianceService.requireForUser(principal.userId, {
          requestedAction: "receive_payout",
          jurisdiction: resolvedMarketCode,
          marketCode: resolvedMarketCode,
          transactionContext: {
            transactionType: "direct_purchase",
            contractConclusionMode: "platform",
            paymentFlow: "psp_marketplace",
            amountMinor: body?.amountMinor,
            currency,
          },
        });
        return paymentsService.requestSellerPayout(
          principal.userId,
          body?.amountMinor,
          currency,
          body?.idempotencyKey,
        );
      },
    );
    this.addRoute(
      "GET",
      "/payments/balance/:sellerId",
      permission("order.manage.seller"),
      async ({ principal, params, marketCode }) =>
        paymentsService.getSellerBalance(
          resolveOwnerId(principal, params.sellerId, "payment.refund"),
          getCountryConfig(requireApiRequestMarket(marketCode))!.currency,
        ),
    );

    // --------------------------------------------------------------------------
    // PROMOTIONS & MONETIZATION ROUTES
    // --------------------------------------------------------------------------
    this.addRoute(
      "GET",
      "/business-rules/catalog",
      PUBLIC,
      async ({ marketCode }) =>
        businessRulesService.getCatalog(
          requireOpenApiRequestMarket(marketCode),
        ),
    );
    this.addRoute(
      "GET",
      "/monetization/professional-plans",
      PUBLIC,
      async ({ marketCode }) =>
        businessRulesService.getProfessionalPlanCatalog(
          requireOpenApiRequestMarket(marketCode),
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
      async ({ principal, marketCode }) =>
        financeService.getAccountDashboard(
          principal.userId,
          requireApiRequestMarket(marketCode),
        ),
    );
    this.addRoute(
      "GET",
      "/finance/organization/overview",
      permission("finance.organization.read.own"),
      async ({ principal, marketCode }) =>
        financeService.getOrganizationDashboard(
          principal.userId,
          requireApiRequestMarket(marketCode),
        ),
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
      async ({ marketCode }) =>
        businessRulesService.getAdminOverview(
          requireApiRequestMarket(marketCode),
        ),
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
          currency: query.get("currency") || undefined,
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
      async ({ query, marketCode }) =>
        unifiedDiscoveryService.getEffectiveConfiguration(
          requireApiRequestMarket(marketCode),
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
      async ({ query, marketCode }) =>
        unifiedDiscoveryService.getMetrics(
          requireApiRequestMarket(marketCode),
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
      async ({ principal, body, marketCode }) =>
        complianceService.startIdentitySession({
          userId: principal.userId,
          dimension: body?.dimension || "identity",
          jurisdiction: requireApiRequestMarket(marketCode),
          returnUrl: complianceReturnUrl(body?.returnTo),
        }),
    );
    this.addRoute(
      "POST",
      "/compliance/payment/onboarding",
      AUTHENTICATED,
      async ({ principal, body, marketCode }) =>
        complianceService.startPaymentOnboarding({
          userId: principal.userId,
          jurisdiction: requireApiRequestMarket(marketCode),
          returnUrl: complianceReturnUrl(body?.returnTo),
          accountToken: body?.accountToken,
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
      "/messaging/conversations",
      permission("message.read.own"),
      async ({ principal }) =>
        messagingService.getUserConversations(principal.userId),
    );
    this.addRoute(
      "POST",
      "/messaging/conversations",
      permission("message.send"),
      async ({ principal, body, marketCode }) =>
        messagingService.createConversationForListing({
          listingId: body?.listingId,
          marketCode: requireApiRequestMarket(marketCode),
          buyerId: principal.userId,
          initialMessage: body?.initialMessage,
        }),
    );
    this.addRoute(
      "GET",
      "/messaging/conversations/:id/messages",
      permission("message.read.own"),
      async ({ principal, params, query }) =>
        messagingService.getMessages(params.id, principal.userId, {
          cursor: query.get("cursor") || undefined,
          limit: query.get("limit") ? Number(query.get("limit")) : undefined,
        }),
    );
    this.addRoute(
      "POST",
      "/messaging/conversations/:id/messages",
      permission("message.send"),
      async ({ principal, params, body }) =>
        messagingService.sendMessage({
          conversationId: params.id,
          senderId: principal.userId,
          text: body?.text,
          attachments: body?.attachments,
          offerPrice: body?.offerPrice,
        }),
    );
    this.addRoute(
      "GET",
      "/messaging/conversations/:id",
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
      "/messaging/offer",
      permission("message.send"),
      async ({ principal, body }) => {
        await this.assertConversationAccess(principal, body?.conversationId);
        return messagingService.makeOffer({
          conversationId: body?.conversationId,
          senderId: principal.userId,
          amountMinor: body?.amountMinor,
        });
      },
    );
    this.addRoute(
      "POST",
      "/messaging/offer-response",
      permission("message.send"),
      async ({ principal, body }) => {
        return messagingService.respondToOffer({
          offerId: body?.offerId,
          userId: principal.userId,
          accept: body?.accept,
        });
      },
    );
    this.addRoute(
      "POST",
      "/messaging/offers/:id/counter",
      permission("message.send"),
      async ({ principal, params, body }) =>
        messagingService.makeOffer({
          conversationId: body?.conversationId,
          senderId: principal.userId,
          amountMinor: body?.amountMinor,
          parentOfferId: params.id,
        }),
    );
    this.addRoute(
      "POST",
      "/messaging/offers/:id/withdraw",
      permission("message.send"),
      async ({ principal, params }) =>
        messagingService.withdrawOffer(params.id, principal.userId),
    );
    this.addRoute(
      "POST",
      "/messaging/schedule-pickup",
      permission("message.send"),
      async ({ principal, body }) => {
        await this.assertConversationAccess(principal, body?.conversationId);
        return messagingService.schedulePickup(
          body?.conversationId,
          principal.userId,
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
      "GET",
      "/messaging/blocked",
      AUTHENTICATED,
      async ({ principal }) => ({
        userIds: await messagingService.getBlockedUserIds(principal.userId),
      }),
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
      "/notifications",
      AUTHENTICATED,
      async ({ principal }) =>
        notificationsService.getUserNotifications(principal.userId),
    );
    this.addRoute(
      "GET",
      "/notifications/unread-count",
      AUTHENTICATED,
      async ({ principal }) => {
        const count = await notificationsService.getUnreadCount(
          principal.userId,
        );
        return { count };
      },
    );
    this.addRoute(
      "GET",
      "/notifications/preferences",
      AUTHENTICATED,
      async ({ principal }) =>
        notificationsService.getPreferences(principal.userId),
    );
    this.addRoute(
      "PUT",
      "/notifications/preferences",
      AUTHENTICATED,
      async ({ principal, body }) =>
        notificationsService.updatePreferences(principal.userId, body || {}),
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
      "/notifications/read-all",
      AUTHENTICATED,
      async ({ principal }) => {
        await notificationsService.markAllAsRead(principal.userId);
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
    this.addRoute(
      "POST",
      "/moderation/cases/:caseId/appeals",
      AUTHENTICATED,
      async ({ principal, params, body }) =>
        moderationService.submitAppeal(
          principal.userId,
          params.caseId,
          body?.reason,
        ),
    );
    this.addRoute(
      "GET",
      "/moderation/cases/mine",
      AUTHENTICATED,
      async ({ principal }) => ({
        items: await moderationService.listOwnCases(principal.userId),
      }),
    );
    this.addRoute(
      "GET",
      "/moderation/appeals/mine",
      AUTHENTICATED,
      async ({ principal }) => ({
        items: await moderationService.listOwnAppeals(principal.userId),
      }),
    );

    // --------------------------------------------------------------------------
    // SUPPORT ROUTES
    // --------------------------------------------------------------------------
    this.addRoute(
      "POST",
      "/support/cases",
      AUTHENTICATED,
      async ({ principal, body }) => supportService.createCase(principal, body),
    );
    this.addRoute(
      "GET",
      "/support/cases/mine",
      AUTHENTICATED,
      async ({ principal }) => ({
        items: await supportService.listOwnCases(principal),
      }),
    );
    this.addRoute(
      "GET",
      "/support/cases",
      permission("support.case.read"),
      async ({ principal, query }) => ({
        items: await supportService.listCases(principal, {
          assigneeId: query.get("assigneeId") || undefined,
          status: query.get("status") || undefined,
          priority: query.get("priority") || undefined,
        } as Parameters<typeof supportService.listCases>[1]),
      }),
    );
    this.addRoute(
      "GET",
      "/support/cases/:id",
      AUTHENTICATED,
      async ({ principal, params }) =>
        supportService.getCase(principal, params.id),
    );
    this.addRoute(
      "PATCH",
      "/support/cases/:id",
      permission("support.case.manage"),
      async ({ principal, params, body }) =>
        supportService.updateCase(principal, params.id, body),
    );
    this.addRoute(
      "POST",
      "/support/cases/:id/notes",
      AUTHENTICATED,
      async ({ principal, params, body }) =>
        supportService.addNote(principal, params.id, body),
    );
    this.addRoute(
      "GET",
      "/support/metrics",
      permission("support.case.read"),
      async ({ principal }) => supportService.getMetrics(principal),
    );

    // --------------------------------------------------------------------------
    // FEATURE FLAGS
    // --------------------------------------------------------------------------
    this.addRoute(
      "GET",
      "/feature-flags/:key",
      PUBLIC,
      async ({ principal, params, query }) =>
        featureFlagService.evaluatePublic(principal, params.key, {
          marketCode: query.get("marketCode") || undefined,
          anonymousId: query.get("anonymousId") || undefined,
        }),
    );
    this.addRoute(
      "GET",
      "/admin/feature-flags",
      permission("admin.configuration.manage"),
      async ({ principal }) => featureFlagService.getAdminSnapshot(principal),
    );
    this.addRoute(
      "PUT",
      "/admin/feature-flags/:key",
      permission("admin.configuration.manage"),
      async ({ principal, params, body }) =>
        featureFlagService.upsertDefinition(principal, params.key, body),
    );
    this.addRoute(
      "PUT",
      "/admin/feature-flags/:key/rules/:ruleId",
      permission("admin.configuration.manage"),
      async ({ principal, params, body }) =>
        featureFlagService.upsertRule(
          principal,
          params.key,
          params.ruleId,
          body,
        ),
    );

    // --------------------------------------------------------------------------
    // MARKETING — generic CRM-native audience and campaign bounded domain.
    // --------------------------------------------------------------------------
    this.addRoute(
      "POST",
      "/marketing/public/subscriptions",
      PUBLIC,
      async ({ body }) => marketingService.subscribePublic(body),
    );
    this.addRoute(
      "POST",
      "/marketing/public/confirm",
      PUBLIC,
      async ({ body }) => marketingService.confirmPublic(body),
    );
    this.addRoute(
      "GET",
      "/marketing/public/preferences",
      PUBLIC,
      async ({ query }) =>
        marketingService.getPublicPreferences(query.get("token") ?? ""),
    );
    this.addRoute(
      "PUT",
      "/marketing/public/preferences",
      PUBLIC,
      async ({ body }) => marketingService.updatePublicPreferences(body),
    );
    this.addRoute(
      "POST",
      "/marketing/public/unsubscribe",
      PUBLIC,
      async ({ body }) => marketingService.unsubscribePublic(body),
    );
    this.addRoute(
      "GET",
      "/marketing/track/open",
      PUBLIC,
      async ({ query, res }) => {
        await marketingTrackingService.record(query.get("token") ?? "", "OPEN");
        const pixel = Buffer.from(
          "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
          "base64",
        );
        res.writeHead(200, {
          "Content-Type": "image/gif",
          "Content-Length": pixel.length,
          "Cache-Control": "no-store, private",
        });
        res.end(pixel);
      },
    );
    this.addRoute(
      "GET",
      "/marketing/track/click",
      PUBLIC,
      async ({ query, res }) => {
        const result = await marketingTrackingService.record(
          query.get("token") ?? "",
          "CLICK",
        );
        if (!result.targetUrl)
          throw new AppError({
            code: "NOT_FOUND",
            message: "Lien de suivi introuvable.",
          });
        res.writeHead(302, {
          Location: result.targetUrl,
          "Cache-Control": "no-store, private",
          "Referrer-Policy": "no-referrer",
        });
        res.end();
      },
    );
    this.addRoute(
      "POST",
      "/marketing/provider-webhooks/:connectionId",
      PUBLIC,
      async ({ req, params, body }) =>
        marketingProviderWebhookService.receive(
          params.connectionId,
          body,
          String((req as any).rawBody || ""),
          req.headers,
        ),
    );
    this.addRoute(
      "GET",
      "/marketing/account/subscription",
      AUTHENTICATED,
      async ({ principal, query }) =>
        marketingService.getAccountSubscription(
          principal,
          query.get("marketCode") ?? undefined,
        ),
    );
    this.addRoute(
      "POST",
      "/marketing/account/subscription",
      AUTHENTICATED,
      async ({ principal, body }) =>
        marketingService.subscribeAccount(principal, body),
    );
    this.addRoute(
      "PUT",
      "/marketing/account/preferences",
      AUTHENTICATED,
      async ({ principal, body }) =>
        marketingService.updateAccountPreferences(principal, body),
    );
    this.addRoute(
      "POST",
      "/marketing/account/unsubscribe",
      AUTHENTICATED,
      async ({ principal, body }) =>
        marketingService.unsubscribeAccount(principal, body?.marketCode),
    );
    this.addRoute(
      "GET",
      "/marketing/dashboard",
      permission("marketing.dashboard.read"),
      async ({ principal }) => marketingService.dashboard(principal),
    );
    this.addRoute(
      "GET",
      "/marketing/profiles",
      permission("marketing.profiles.read"),
      async ({ principal, query }) =>
        marketingService.listProfiles(principal, {
          limit: query.get("limit") ?? undefined,
          cursor: query.get("cursor") ?? undefined,
          query: query.get("query") ?? undefined,
          status: query.get("status") ?? undefined,
        }),
    );
    this.addRoute(
      "POST",
      "/marketing/profiles",
      permission("marketing.profiles.manage"),
      async ({ principal, body }) =>
        marketingService.createProfile(principal, body),
    );
    this.addRoute(
      "POST",
      "/marketing/profiles/:profileId/confirm",
      permission("marketing.profiles.manage"),
      async ({ principal, params }) =>
        marketingService.confirmProfile(principal, params.profileId),
    );
    this.addRoute(
      "POST",
      "/marketing/profiles/:profileId/unsubscribe",
      permission("marketing.profiles.manage"),
      async ({ principal, params }) =>
        marketingService.unsubscribeProfile(principal, params.profileId),
    );
    this.addRoute(
      "GET",
      "/marketing/lists",
      permission("marketing.lists.read"),
      async ({ principal }) => marketingService.listLists(principal),
    );
    this.addRoute(
      "POST",
      "/marketing/lists",
      permission("marketing.lists.manage"),
      async ({ principal, body }) =>
        marketingService.createList(principal, body),
    );
    this.addRoute(
      "POST",
      "/marketing/lists/:listId/members/:profileId",
      permission("marketing.lists.manage"),
      async ({ principal, params }) =>
        marketingService.addListMember(
          principal,
          params.listId,
          params.profileId,
        ),
    );
    this.addRoute(
      "GET",
      "/marketing/segments",
      permission("marketing.segments.read"),
      async ({ principal }) => marketingService.listSegments(principal),
    );
    this.addRoute(
      "POST",
      "/marketing/segments",
      permission("marketing.segments.manage"),
      async ({ principal, body }) =>
        marketingService.createSegment(principal, body),
    );
    this.addRoute(
      "GET",
      "/marketing/templates",
      permission("marketing.templates.read"),
      async ({ principal }) => marketingService.listTemplates(principal),
    );
    this.addRoute(
      "POST",
      "/marketing/templates",
      permission("marketing.templates.manage"),
      async ({ principal, body }) =>
        marketingService.createTemplate(principal, body),
    );
    this.addRoute(
      "GET",
      "/marketing/campaigns",
      permission("marketing.campaigns.read"),
      async ({ principal }) => marketingService.listCampaigns(principal),
    );
    this.addRoute(
      "POST",
      "/marketing/campaigns/audience-estimate",
      permission("marketing.campaigns.read"),
      async ({ principal, body }) =>
        marketingService.estimateAudience(principal, body),
    );
    this.addRoute(
      "POST",
      "/marketing/ai/campaign-draft",
      permission("marketing.campaigns.create"),
      async ({ principal, body }) =>
        marketingService.generateCampaignDraft(principal, body),
    );
    this.addRoute(
      "POST",
      "/marketing/campaigns",
      permission("marketing.campaigns.create"),
      async ({ principal, body }) =>
        marketingService.createCampaign(principal, body),
    );
    this.addRoute(
      "GET",
      "/marketing/campaigns/:campaignId",
      permission("marketing.campaigns.read"),
      async ({ principal, params }) =>
        marketingService.getCampaign(principal, params.campaignId),
    );
    this.addRoute(
      "POST",
      "/marketing/campaigns/:campaignId/preflight",
      permission("marketing.campaigns.read"),
      async ({ principal, params }) =>
        marketingService.preflight(principal, params.campaignId),
    );
    this.addRoute(
      "POST",
      "/marketing/campaigns/:campaignId/test-send",
      permission("marketing.campaigns.send"),
      async ({ principal, params, body }) =>
        marketingService.testSend(principal, params.campaignId, body),
    );
    this.addRoute(
      "POST",
      "/marketing/campaigns/:campaignId/send",
      permission("marketing.campaigns.send"),
      async ({ principal, params }) =>
        marketingService.send(principal, params.campaignId),
    );
    this.addRoute(
      "POST",
      "/marketing/campaigns/:campaignId/schedule",
      permission("marketing.campaigns.send"),
      async ({ principal, params, body }) =>
        marketingService.schedule(principal, params.campaignId, body),
    );
    this.addRoute(
      "POST",
      "/marketing/campaigns/:campaignId/pause",
      permission("marketing.campaigns.pause"),
      async ({ principal, params }) =>
        marketingService.pause(principal, params.campaignId),
    );
    this.addRoute(
      "POST",
      "/marketing/campaigns/:campaignId/resume",
      permission("marketing.campaigns.pause"),
      async ({ principal, params }) =>
        marketingService.resume(principal, params.campaignId),
    );
    this.addRoute(
      "POST",
      "/marketing/campaigns/:campaignId/review",
      permission("marketing.campaigns.update"),
      async ({ principal, params }) =>
        marketingService.submitForReview(principal, params.campaignId),
    );
    this.addRoute(
      "POST",
      "/marketing/campaigns/:campaignId/approve",
      permission("marketing.campaigns.approve"),
      async ({ principal, params }) =>
        marketingService.approve(principal, params.campaignId),
    );
    this.addRoute(
      "POST",
      "/marketing/campaigns/:campaignId/select-winner",
      permission("marketing.campaigns.update"),
      async ({ principal, params, body }) =>
        marketingService.selectExperimentWinner(
          principal,
          params.campaignId,
          body,
        ),
    );
    this.addRoute(
      "POST",
      "/marketing/campaigns/:campaignId/cancel",
      permission("marketing.campaigns.cancel"),
      async ({ principal, params }) =>
        marketingService.cancel(principal, params.campaignId),
    );
    this.addRoute(
      "GET",
      "/marketing/suppressions",
      permission("marketing.compliance.read"),
      async ({ principal }) => marketingService.listSuppressions(principal),
    );
    this.addRoute(
      "GET",
      "/marketing/analytics",
      permission("marketing.analytics.read"),
      async ({ principal, query }) =>
        marketingOperationsService.analytics(
          principal,
          query.get("campaignId") ?? undefined,
        ),
    );
    this.addRoute(
      "POST",
      "/marketing/conversions",
      permission("marketing.campaigns.update"),
      async ({ principal, body }) =>
        marketingOperationsService.recordConversion(principal, body),
    );
    this.addRoute(
      "GET",
      "/marketing/usage",
      permission("marketing.dashboard.read"),
      async ({ principal }) => marketingOperationsService.usage(principal),
    );
    this.addRoute(
      "GET",
      "/marketing/journeys",
      permission("marketing.automation.read"),
      async ({ principal }) =>
        marketingOperationsService.listJourneys(principal),
    );
    this.addRoute(
      "POST",
      "/marketing/journeys",
      permission("marketing.automation.manage"),
      async ({ principal, body }) =>
        marketingOperationsService.createJourney(principal, body),
    );
    this.addRoute(
      "POST",
      "/marketing/journeys/:journeyId/activate",
      permission("marketing.automation.manage"),
      async ({ principal, params }) =>
        marketingOperationsService.setJourneyStatus(
          principal,
          params.journeyId,
          "ACTIVE",
        ),
    );
    this.addRoute(
      "POST",
      "/marketing/journeys/:journeyId/pause",
      permission("marketing.automation.manage"),
      async ({ principal, params }) =>
        marketingOperationsService.setJourneyStatus(
          principal,
          params.journeyId,
          "PAUSED",
        ),
    );
    this.addRoute(
      "POST",
      "/marketing/journeys/events",
      permission("marketing.automation.manage"),
      async ({ principal, body }) =>
        marketingOperationsService.emitJourneyEvent(principal, body),
    );
    this.addRoute(
      "GET",
      "/marketing/journey-executions",
      permission("marketing.automation.read"),
      async ({ principal, query }) =>
        marketingOperationsService.listJourneyExecutions(
          principal,
          query.get("journeyId") ?? undefined,
        ),
    );
    this.addRoute(
      "GET",
      "/marketing/webhooks",
      permission("marketing.settings.manage"),
      async ({ principal }) =>
        marketingOperationsService.listWebhookSubscriptions(principal),
    );
    this.addRoute(
      "POST",
      "/marketing/webhooks",
      permission("marketing.settings.manage"),
      async ({ principal, body }) =>
        marketingOperationsService.createWebhookSubscription(principal, body),
    );
    this.addRoute(
      "POST",
      "/marketing/ai/assist",
      permission("marketing.campaigns.create"),
      async ({ principal, body }) =>
        marketingOperationsService.aiAssist(principal, body),
    );

    // --------------------------------------------------------------------------
    // CRM ROUTES — tenant context is derived by CrmService from the principal.
    // --------------------------------------------------------------------------
    this.addRoute(
      "GET",
      "/crm/dashboard",
      permission("crm.dashboard.read"),
      async ({ principal }) => crmService.dashboard(principal),
    );
    this.addRoute(
      "GET",
      "/crm/accounts",
      permission("crm.accounts.read"),
      async ({ principal, query }) =>
        crmService.listAccounts(principal, {
          limit: query.get("limit") ?? undefined,
          cursor: query.get("cursor") ?? undefined,
          query: query.get("query") ?? undefined,
        }),
    );
    this.addRoute(
      "POST",
      "/crm/accounts",
      permission("crm.accounts.create"),
      async ({ principal, body }) => crmService.createAccount(principal, body),
    );
    this.addRoute(
      "POST",
      "/crm/account-duplicates/check",
      permission("crm.accounts.read"),
      async ({ principal, body }) =>
        crmService.findAccountDuplicates(principal, body),
    );
    this.addRoute(
      "GET",
      "/crm/accounts/:accountId",
      permission("crm.accounts.read"),
      async ({ principal, params }) =>
        crmService.getAccount(principal, params.accountId),
    );
    this.addRoute(
      "GET",
      "/crm/accounts/:accountId/shongre",
      permission("crm.accounts.read"),
      async ({ principal, params }) =>
        crmShongreService.accountIntelligence(principal, params.accountId),
    );
    this.addRoute(
      "PATCH",
      "/crm/accounts/:accountId",
      permission("crm.accounts.update"),
      async ({ principal, params, body }) =>
        crmService.updateAccount(principal, params.accountId, body),
    );
    this.addRoute(
      "GET",
      "/crm/contacts",
      permission("crm.contacts.read"),
      async ({ principal, query }) =>
        crmService.listContacts(principal, {
          limit: query.get("limit") ?? undefined,
          cursor: query.get("cursor") ?? undefined,
          query: query.get("query") ?? undefined,
        }),
    );
    this.addRoute(
      "POST",
      "/crm/contacts",
      permission("crm.contacts.create"),
      async ({ principal, body }) => crmService.createContact(principal, body),
    );
    this.addRoute(
      "GET",
      "/crm/contacts/:contactId",
      permission("crm.contacts.read"),
      async ({ principal, params }) =>
        crmService.getContact(principal, params.contactId),
    );
    this.addRoute(
      "PATCH",
      "/crm/contacts/:contactId",
      permission("crm.contacts.update"),
      async ({ principal, params, body }) =>
        crmService.updateContact(principal, params.contactId, body),
    );
    this.addRoute(
      "GET",
      "/crm/pipelines",
      permission("crm.pipelines.read"),
      async ({ principal }) => crmService.listPipelines(principal),
    );
    this.addRoute(
      "POST",
      "/crm/pipelines",
      permission("crm.pipelines.manage"),
      async ({ principal, body }) => crmService.createPipeline(principal, body),
    );
    this.addRoute(
      "PATCH",
      "/crm/pipelines/:pipelineId",
      permission("crm.pipelines.manage"),
      async ({ principal, params, body }) =>
        crmService.updatePipeline(principal, params.pipelineId, body),
    );
    this.addRoute(
      "GET",
      "/crm/opportunities",
      permission("crm.opportunities.read"),
      async ({ principal, query }) =>
        crmService.listOpportunities(principal, {
          limit: query.get("limit") ?? undefined,
          cursor: query.get("cursor") ?? undefined,
          query: query.get("query") ?? undefined,
        }),
    );
    this.addRoute(
      "POST",
      "/crm/opportunities",
      permission("crm.opportunities.create"),
      async ({ principal, body }) =>
        crmService.createOpportunity(principal, body),
    );
    this.addRoute(
      "GET",
      "/crm/opportunities/:opportunityId",
      permission("crm.opportunities.read"),
      async ({ principal, params }) =>
        crmService.getOpportunity(principal, params.opportunityId),
    );
    this.addRoute(
      "POST",
      "/crm/opportunities/:opportunityId/transition",
      permission("crm.opportunities.transition"),
      async ({ principal, params, body }) =>
        crmService.transitionOpportunity(principal, params.opportunityId, body),
    );
    this.addRoute(
      "GET",
      "/crm/tasks",
      permission("crm.tasks.read"),
      async ({ principal, query }) =>
        crmService.listTasks(principal, {
          limit: query.get("limit") ?? undefined,
          cursor: query.get("cursor") ?? undefined,
          query: query.get("query") ?? undefined,
        }),
    );
    this.addRoute(
      "POST",
      "/crm/tasks",
      permission("crm.tasks.create"),
      async ({ principal, body }) => crmService.createTask(principal, body),
    );
    this.addRoute(
      "POST",
      "/crm/tasks/:taskId/complete",
      permission("crm.tasks.complete"),
      async ({ principal, params, body }) =>
        crmService.completeTask(principal, params.taskId, body),
    );
    this.addRoute(
      "GET",
      "/crm/activities",
      permission("crm.activities.read"),
      async ({ principal, query }) =>
        crmService.listActivities(
          principal,
          query.get("entityType") ?? "",
          query.get("entityId") ?? "",
          query.get("limit") ?? undefined,
        ),
    );
    this.addRoute(
      "POST",
      "/crm/activities",
      permission("crm.activities.create"),
      async ({ principal, body }) => crmService.addActivity(principal, body),
    );
    this.addRoute(
      "GET",
      "/crm/products",
      permission("crm.products.read"),
      async ({ principal, query }) =>
        crmService.listProducts(principal, {
          limit: query.get("limit") ?? undefined,
          cursor: query.get("cursor") ?? undefined,
          query: query.get("query") ?? undefined,
        }),
    );
    this.addRoute(
      "POST",
      "/crm/products",
      permission("crm.products.manage"),
      async ({ principal, body }) => crmService.createProduct(principal, body),
    );
    this.addRoute(
      "PATCH",
      "/crm/products/:productId",
      permission("crm.products.manage"),
      async ({ principal, params, body }) =>
        crmService.updateProduct(principal, params.productId, body),
    );
    this.addRoute(
      "GET",
      "/crm/quotes",
      permission("crm.quotes.read"),
      async ({ principal, query }) =>
        crmService.listQuotes(principal, {
          limit: query.get("limit") ?? undefined,
          cursor: query.get("cursor") ?? undefined,
          query: query.get("query") ?? undefined,
          opportunityId: query.get("opportunityId") ?? undefined,
        }),
    );
    this.addRoute(
      "POST",
      "/crm/quotes",
      permission("crm.quotes.create"),
      async ({ principal, body }) => crmService.createQuote(principal, body),
    );
    this.addRoute(
      "GET",
      "/crm/custom-fields",
      permission("crm.custom_fields.read"),
      async ({ principal, query }) =>
        crmService.listCustomFields(
          principal,
          query.get("entityType") ?? undefined,
        ),
    );
    this.addRoute(
      "POST",
      "/crm/custom-fields",
      permission("crm.custom_fields.manage"),
      async ({ principal, body }) =>
        crmService.createCustomField(principal, body),
    );
    this.addRoute(
      "GET",
      "/crm/saved-views",
      permission("crm.access"),
      async ({ principal, query }) =>
        crmService.listSavedViews(
          principal,
          query.get("entityType") ?? undefined,
        ),
    );
    this.addRoute(
      "POST",
      "/crm/saved-views",
      permission("crm.access"),
      async ({ principal, body }) =>
        crmService.createSavedView(principal, body),
    );
    this.addRoute(
      "PUT",
      "/crm/saved-views/:savedViewId",
      permission("crm.access"),
      async ({ principal, params, body }) =>
        crmService.updateSavedView(principal, params.savedViewId, body),
    );
    this.addRoute(
      "DELETE",
      "/crm/saved-views/:savedViewId",
      permission("crm.access"),
      async ({ principal, params, query }) =>
        crmService.deleteSavedView(
          principal,
          params.savedViewId,
          query.get("expectedVersion"),
        ),
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
      "GET",
      "/provider-connections",
      permission("provider.configuration.read"),
      async ({ principal }) =>
        providerConnectionService.listForPrincipal(principal),
    );
    this.addRoute(
      "POST",
      "/provider-connections",
      permission("provider.configuration.manage"),
      async ({ principal, body }) =>
        providerConnectionService.createForPrincipal(principal, body),
    );
    this.addRoute(
      "PUT",
      "/provider-connections/:connectionId/credential",
      permission("provider.credentials.manage"),
      async ({ principal, params, body }) =>
        providerConnectionService.rotateCredentialForPrincipal(
          principal,
          params.connectionId,
          body,
        ),
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
      "GET",
      "/admin/moderation/cases",
      permission("moderation.review"),
      async ({ query }) => ({
        items: await moderationService.listCases(
          query.get("status") || undefined,
        ),
      }),
    );
    this.addRoute(
      "GET",
      "/admin/moderation/appeals",
      permission("moderation.review"),
      async ({ query }) => ({
        items: await moderationService.listAppeals(
          query.get("status") || undefined,
        ),
      }),
    );
    this.addRoute(
      "POST",
      "/admin/moderation/appeals/:appealId/decision",
      permission("moderation.action"),
      async ({ principal, params, body }) =>
        moderationService.decideAppeal({
          appealId: params.appealId,
          reviewerId: principal.userId,
          decision: body?.decision,
          reason: body?.reason,
        }),
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
      async ({ marketCode }) =>
        trendingService.getConfig(requireApiRequestMarket(marketCode)),
    );
    this.addRoute(
      "PUT",
      "/admin/trending/config",
      permission("admin.configuration.manage"),
      async ({ body, marketCode }) => {
        const resolvedMarketCode = requireApiRequestMarket(marketCode);
        return trendingService.saveConfig(
          resolvedMarketCode,
          sanitizeTrendingConfigPatch(body),
        );
      },
    );
    this.addRoute(
      "PUT",
      "/admin/trending/overrides/:topicKey",
      permission("admin.configuration.manage"),
      async ({ params, body, marketCode }) =>
        trendingService.upsertOverride(requireApiRequestMarket(marketCode), {
          ...sanitizeTrendingOverride(body),
          topicKey: params.topicKey,
        }),
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
      const orders = await ordersService.handleStripeWebhook(
        body,
        rawBody ?? "",
      );
      const identityCompliance = String(body?.type || "").startsWith(
        "identity.verification_session.",
      )
        ? await complianceService.handleProviderWebhook({
            provider: "identity",
            payload: body,
            rawBody: rawBody ?? "",
          })
        : null;
      const paymentCompliance =
        body?.type === "account.updated"
          ? await complianceService.handleProviderWebhook({
              provider: "payment",
              payload: body,
              rawBody: rawBody ?? "",
            })
          : null;
      logger.info(`Stripe webhook accepted: ${body?.type || "unknown event"}`);
      return {
        received: true,
        auto,
        realEstate,
        monetization,
        orders,
        identityCompliance,
        paymentCompliance,
      };
    });
    this.addRoute(
      "POST",
      "/webhooks/stripe-connect-v2",
      PUBLIC,
      async ({ req, body }) => {
        const rawBody = ((req as any).rawBody as string | undefined) ?? "";
        const signature = req.headers["stripe-signature"];
        const verified = verifyStripeSignature({
          payload: rawBody,
          signatureHeader: Array.isArray(signature) ? signature[0] : signature,
          secret: config.stripeConnectWebhookSecret || "",
        });
        if (!verified.ok) {
          logger.warn(`Stripe Connect v2 webhook rejected: ${verified.reason}`);
          throw new AppError({
            code: "FORBIDDEN",
            message: "Signature de webhook invalide.",
          });
        }
        if (!String(body?.type || "").startsWith("v2.core.account")) {
          return { received: true, ignored: true };
        }
        const paymentCompliance = await complianceService.handleProviderWebhook(
          {
            provider: "payment",
            payload: body,
            rawBody,
          },
        );
        return { received: true, paymentCompliance };
      },
    );
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
    const listing = await listingsService.getInternalListingById(listingId);
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

    const prefix = config.apiPrefix;
    if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: `Route ${(req.method || "GET").toUpperCase()} ${pathname} not found`,
            statusCode: 404,
          },
        }),
      );
      return;
    }
    pathname = pathname.substring(prefix.length) || "/";

    const method = (req.method || "GET").toUpperCase();

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = pathname.match(route.pattern);
      if (!match) continue;

      const params: Record<string, string> = {};
      route.paramNames.forEach((name, idx) => {
        params[name] = decodeURIComponent(match[idx + 1]);
      });

      try {
        let body: any = null;
        if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
          body = await this.readRequestBody(req);
          if (route.requestBodyRequired && body === null) {
            throw new AppError({
              code: "BAD_REQUEST",
              message: "Un corps de requête est requis.",
            });
          }
        }
        for (const [name, expectedType] of Object.entries(
          route.queryParameters,
        )) {
          const value = parsedUrl.searchParams.get(name);
          if (value === null) continue;
          const valid =
            expectedType === "integer"
              ? /^-?\d+$/.test(value)
              : expectedType === "boolean"
                ? value === "true" || value === "false"
                : true;
          if (!valid) {
            throw new AppError({
              code: "VALIDATION_ERROR",
              message: `Paramètre de requête invalide : ${name}.`,
            });
          }
        }
        const marketCode = resolveApiRequestMarket({
          req,
          query: parsedUrl.searchParams,
          body,
        });
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
          pathname === "/auth/domain-handoff/exchange" ||
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
          marketCode,
        });

        if (res.writableEnded) return;

        res.writeHead(route.successStatus, {
          "Content-Type": "application/json",
        });
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
    const normalizedError =
      err instanceof ZodError
        ? new AppError({
            code: "VALIDATION_ERROR",
            message: "La requête ne respecte pas le contrat attendu.",
            details: {
              issues: err.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
              })),
            },
          })
        : err;
    const isAppError = normalizedError instanceof AppError;
    const statusCode = isAppError ? normalizedError.statusCode : 500;

    if (!isAppError) {
      // Unexpected failures are logged in full but never returned: provider
      // errors and stack traces routinely carry connection strings and ids.
      logger.error(
        `Unhandled error on ${method} ${pathname}: ${normalizedError?.stack || normalizedError?.message || normalizedError}`,
      );
    }

    const payload = isAppError
      ? normalizedError.toJSON()
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
    return new Promise((resolve, reject) => {
      const declaredLength = Number(req.headers["content-length"] || 0);
      if (
        Number.isFinite(declaredLength) &&
        declaredLength > config.maxRequestBodyBytes
      ) {
        req.resume();
        reject(
          new AppError({
            code: "BAD_REQUEST",
            statusCode: 413,
            message: "Corps de requête trop volumineux.",
          }),
        );
        return;
      }

      const chunks: Buffer[] = [];
      let receivedBytes = 0;
      let settled = false;
      req.on("data", (chunk: Buffer) => {
        if (settled) return;
        receivedBytes += chunk.length;
        if (receivedBytes > config.maxRequestBodyBytes) {
          settled = true;
          reject(
            new AppError({
              code: "BAD_REQUEST",
              statusCode: 413,
              message: "Corps de requête trop volumineux.",
            }),
          );
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => {
        if (settled) return;
        settled = true;
        const data = Buffer.concat(chunks).toString("utf8");
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
        if (contentType.includes("application/json")) {
          try {
            return resolve(JSON.parse(data));
          } catch {
            return reject(
              new AppError({
                code: "BAD_REQUEST",
                message: "Corps JSON invalide.",
              }),
            );
          }
        }
        resolve(data);
      });
      req.on("aborted", () => {
        if (settled) return;
        settled = true;
        reject(
          new AppError({
            code: "BAD_REQUEST",
            message: "Requête interrompue.",
          }),
        );
      });
      req.on("error", (error) => {
        if (settled) return;
        settled = true;
        reject(error);
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
  return new URL(safePath, config.frontendUrl).toString();
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
