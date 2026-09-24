import { registerTaxonomyAdminRoutes } from "../../modules/taxonomy/api/taxonomy-admin.routes.js";
import { enrichRequestContext } from "../../infrastructure/observability/request-context.js";
import {
  type RouteAccess,
  type RouteHandler,
  type RouteRegistrar,
} from "./route-contract.js";
import { registerDigitalProductsRoutes } from "../../modules/digital-products/api/digital-products.routes.js";
import { registerAnalyticsRoutes } from "../../modules/analytics/api/analytics.routes.js";
import { registerAuthRoutes } from "../../modules/auth/api/auth.routes.js";
import { registerAiRoutes } from "../../modules/ai/api/ai.routes.js";
import { registerUsersRoutes } from "../../modules/users/api/users.routes.js";
import { registerDiscoveryRoutes } from "../../modules/discovery/api/discovery.routes.js";
import { registerListingsRoutes } from "../../modules/listings/api/listings.routes.js";
import { registerHomepageRoutes } from "../../modules/homepage/api/homepage.routes.js";
import { registerTaxonomyRoutes } from "../../modules/taxonomy/api/taxonomy.routes.js";
import { registerGeoRoutes } from "../../modules/geo/api/geo.routes.js";
import { registerCoursesRoutes } from "../../modules/courses/api/courses.routes.js";
import { registerRealEstateRoutes } from "../../modules/real-estate/api/real-estate.routes.js";
import { registerAutoRoutes } from "../../modules/auto/api/auto.routes.js";
import { registerEmploymentRoutes } from "../../modules/employment/api/employment.routes.js";
import { registerCurrenciesRoutes } from "../../modules/currencies/api/currencies.routes.js";
import { registerAdminRoutes } from "../../modules/admin/api/admin.routes.js";
import { registerMarketsRoutes } from "../../modules/markets/api/markets.routes.js";
import { registerOrdersRoutes } from "../../modules/orders/api/orders.routes.js";
import { registerDeliveryRoutes } from "../../modules/delivery/api/delivery.routes.js";
import { registerPaymentsRoutes } from "../../modules/payments/api/payments.routes.js";
import { registerBusinessRulesRoutes } from "../../modules/business-rules/api/business-rules.routes.js";
import { registerMonetizationRoutes } from "../../modules/business-rules/api/monetization.routes.js";
import { registerFinanceRoutes } from "../../modules/finance/api/finance.routes.js";
import { registerComplianceRoutes } from "../../modules/compliance/api/compliance.routes.js";
import { registerVerificationRoutes } from "../../modules/verification/api/verification.routes.js";
import { registerMessagingRoutes } from "../../modules/messaging/api/messaging.routes.js";
import { registerNotificationsRoutes } from "../../modules/notifications/api/notifications.routes.js";
import { registerWatchSubscriptionsRoutes } from "../../modules/watch-subscriptions/api/watch-subscriptions.routes.js";
import { registerReviewsRoutes } from "../../modules/reviews/api/reviews.routes.js";
import { registerModerationRoutes } from "../../modules/moderation/api/moderation.routes.js";
import { registerSupportRoutes } from "../../modules/support/api/support.routes.js";
import { registerFeatureFlagsRoutes } from "../../modules/feature-flags/api/feature-flags.routes.js";
import { registerSolutionsRoutes } from "../../modules/solutions/api/solutions.routes.js";
import { registerMarketingRoutes } from "../../modules/marketing/api/marketing.routes.js";
import { registerInvoicingRoutes } from "../../modules/invoicing/api/invoicing.routes.js";
import { registerCrmRoutes } from "../../modules/crm/api/crm.routes.js";
import { registerWorkspaceRoutes } from "../../modules/workspace/api/workspace.routes.js";
import { registerProvidersRoutes } from "../../modules/providers/api/providers.routes.js";
import { registerWebhooksRoutes } from "../../infrastructure/http/webhook.routes.js";
import { OPENAPI_OPERATIONS } from "../../generated/openapi-manifest.js";
import { IncomingMessage, ServerResponse } from "http";
import { config } from "../../app/config/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { resolveApiRequestMarket } from "../../modules/markets/request-market-context.js";
import {
  requestMetadata,
  accessCookie,
  requireCsrf,
} from "../../shared/auth/http-session.js";
import {
  isAuthenticated,
  Principal,
  GUEST_PRINCIPAL,
  forbidStaffMarketplaceAccess,
  requireAuthenticated,
  requirePermission,
} from "../../shared/auth/principal.js";
import { apiRateLimiter } from "../../infrastructure/security/api-rate-limiter.js";
import { extractBearerToken } from "../../shared/auth/tokens.js";
import {
  cacheInvalidationTags,
  writeJsonResponse,
} from "../../infrastructure/http/public-response-policy.js";
import {
  errorDiagnostics,
  logger,
} from "../../infrastructure/logging/logger.js";
import { authService } from "../../modules/auth/auth.service.js";
import { ZodError } from "zod";
import { captureServerException } from "../../infrastructure/observability/sentry.js";

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
  denyStaffMarketplace: boolean;
}

export interface ParsedRequestBody {
  body: unknown;
  rawBody: string;
}

export class ApiV1Router implements RouteRegistrar {
  private routes: RouteDef[] = [];

  constructor() {
    registerDigitalProductsRoutes(this);
    registerAnalyticsRoutes(this);
    registerAuthRoutes(this);
    registerAiRoutes(this);
    registerUsersRoutes(this);
    registerDiscoveryRoutes(this);
    registerListingsRoutes(this);
    registerHomepageRoutes(this);
    registerTaxonomyRoutes(this);
    registerGeoRoutes(this);
    registerTaxonomyAdminRoutes(this);
    registerCoursesRoutes(this);
    registerRealEstateRoutes(this);
    registerAutoRoutes(this);
    registerEmploymentRoutes(this);
    registerCurrenciesRoutes(this);
    registerAdminRoutes(this);
    registerMarketsRoutes(this);
    registerOrdersRoutes(this);
    registerDeliveryRoutes(this);
    registerPaymentsRoutes(this);
    registerBusinessRulesRoutes(this);
    registerMonetizationRoutes(this);
    registerFinanceRoutes(this);
    registerComplianceRoutes(this);
    registerVerificationRoutes(this);
    registerMessagingRoutes(this);
    registerNotificationsRoutes(this);
    registerWatchSubscriptionsRoutes(this);
    registerReviewsRoutes(this);
    registerModerationRoutes(this);
    registerSupportRoutes(this);
    registerFeatureFlagsRoutes(this);
    registerSolutionsRoutes(this);
    registerMarketingRoutes(this);
    registerInvoicingRoutes(this);
    registerCrmRoutes(this);
    registerWorkspaceRoutes(this);
    registerProvidersRoutes(this);
    registerWebhooksRoutes(this);
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

  addRoute(
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
            denyStaffMarketplace: boolean;
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
    const regexPath = path
      .split(/(:[a-zA-Z0-9_]+)/g)
      .map((part) => {
        if (!part.startsWith(":"))
          return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        paramNames.push(part.slice(1));
        return "([^/]+)";
      })
      .join("");
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
      denyStaffMarketplace: operation.denyStaffMarketplace,
    });
  }

  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    parsedRequestBody?: ParsedRequestBody,
  ): Promise<void> {
    const rawUrl = req.url || "/";
    const parsedUrl = new URL(rawUrl, "http://request.invalid");
    let pathname = parsedUrl.pathname;

    const prefix = config.apiPrefix;
    if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
      this.writeError(
        res,
        new AppError({ code: "NOT_FOUND", message: "Route introuvable." }),
        String(req.method || "GET"),
        "[unmatched]",
      );
      return;
    }
    pathname = pathname.substring(prefix.length) || "/";

    const method = (req.method || "GET").toUpperCase();

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = pathname.match(route.pattern);
      if (!match) continue;

      enrichRequestContext({
        operationId: route.operationId,
        route: `${prefix}${route.path}`,
      });
      try {
        const params: Record<string, string> = {};
        try {
          route.paramNames.forEach((name, idx) => {
            params[name] = decodeURIComponent(match[idx + 1]);
          });
        } catch {
          throw new AppError({
            code: "BAD_REQUEST",
            message: "Le chemin de la requête est invalide.",
          });
        }
        let body: any = null;
        if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
          if (parsedRequestBody) {
            if (
              Buffer.byteLength(parsedRequestBody.rawBody) >
              config.maxRequestBodyBytes
            ) {
              throw new AppError({
                code: "BAD_REQUEST",
                statusCode: 413,
                message: "Corps de requête trop volumineux.",
              });
            }
            body = parsedRequestBody.body;
            // Webhook signature verification must see the original bytes that
            // Fastify captured before parsing, never re-serialized JSON.
            (req as IncomingMessage & { rawBody?: string }).rawBody =
              parsedRequestBody.rawBody;
          } else {
            body = await this.readRequestBody(req);
          }
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
        enrichRequestContext({
          marketCode,
          actorId: isAuthenticated(principal) ? principal.userId : undefined,
        });
        if (
          !pathname.startsWith("/webhooks/") &&
          !pathname.startsWith("/auth/") &&
          pathname !== "/analytics/events"
        ) {
          const metadata = requestMetadata(req);
          const authenticated = isAuthenticated(principal);
          await apiRateLimiter.consume({
            subject: authenticated
              ? principal.userId
              : metadata.ipPrefix || "unknown",
            authenticated,
          });
        }
        this.enforceAccess(route.access, principal, route.denyStaffMarketplace);

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
          requestId: String(res.getHeader("X-Request-Id") || ""),
        });

        if (res.writableEnded) return;

        const invalidatedTags = cacheInvalidationTags({
          method,
          operationId: route.operationId,
          marketCode,
          params,
        });
        if (invalidatedTags.length > 0) {
          logger.info("public_cache_invalidation_requested", {
            operationId: route.operationId,
            marketCode,
            tags: invalidatedTags,
          });
          res.setHeader(
            "X-Shongre-Cache-Invalidate",
            invalidatedTags.join(","),
          );
        }
        await writeJsonResponse({
          req,
          res,
          method,
          operationId: route.operationId,
          accessKind: route.access.kind,
          statusCode: route.successStatus,
          marketCode,
          params,
          result,
        });
      } catch (err: any) {
        this.writeError(res, err, method, route.path);
      }
      return;
    }

    this.writeError(
      res,
      new AppError({ code: "NOT_FOUND", message: "Route introuvable." }),
      String(req.method || "GET"),
      "[unmatched]",
    );
  }

  private async resolvePrincipal(req: IncomingMessage): Promise<Principal> {
    const token =
      extractBearerToken(req.headers.authorization) || accessCookie(req);
    if (!token) return GUEST_PRINCIPAL;
    return authService.resolvePrincipal(token);
  }

  private enforceAccess(
    access: RouteAccess,
    principal: Principal,
    denyStaffMarketplace: boolean,
  ): void {
    if (denyStaffMarketplace) forbidStaffMarketplaceAccess(principal);
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
      // Unexpected failures are logged with their diagnostics but never
      // returned: provider errors and stack traces routinely carry connection
      // strings and ids. The logger redacts configured secrets and tokens.
      logger.error("http_operation_failed", {
        method,
        operation: pathname,
        ...errorDiagnostics(normalizedError, { includeStack: true }),
      });
    }
    if (!isAppError || statusCode >= 500) {
      // A server-side AppError (an unavailable database or provider) is an
      // incident too; report the cause it wraps, not the generic envelope.
      captureServerException(
        (isAppError && normalizedError.originalError) || normalizedError,
        {
          requestId: String(res.getHeader("X-Request-Id") || ""),
          operation: `${method} ${pathname}`,
        },
      );
    }

    const payload = (
      isAppError
        ? normalizedError
        : new AppError({
            code: "INTERNAL_ERROR",
            message: "Une erreur interne est survenue.",
          })
    ).toJSON(String(res.getHeader("X-Request-Id") || ""));

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    };
    if (
      isAppError &&
      normalizedError.code === "RATE_LIMITED" &&
      Number.isFinite(normalizedError.details?.retryAfterSeconds)
    ) {
      headers["Retry-After"] = String(
        Math.max(1, Number(normalizedError.details?.retryAfterSeconds)),
      );
    }
    res.writeHead(statusCode, headers);
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

export const apiV1Router = new ApiV1Router();
