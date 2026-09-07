import { IncomingMessage } from "http";
import {
  type AuthorizationSubject,
  Permission,
  permissionsForSubject,
} from "../../../shared/auth/rbac.js";
import {
  type RouteRegistrar,
  PUBLIC,
  permission,
  AUTHENTICATED,
  type RouteContext,
} from "../../../api/v1/route-contract.js";
import { authService } from "../auth.service.js";
import { invoicingService } from "../../invoicing/invoicing.service.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  requestMetadata,
  setSessionCookies,
  clearSessionCookies,
  refreshCookie,
  setOAuthCompletionCookie,
  oauthCompletionCookie,
} from "../../../shared/auth/http-session.js";
import { socialAuthService } from "../social-auth.service.js";
import { config } from "../../../app/config/index.js";
import { redirectResponse } from "../../../infrastructure/http/redirect-response.js";
import { facebookDataDeletionService } from "../facebook-data-deletion.service.js";

function isNativeClient(req: IncomingMessage): boolean {
  return (
    String(req.headers["x-shongre-client"] || "").toLowerCase() === "native"
  );
}

function authUserProjection<T extends AuthorizationSubject>(
  user: T,
  capabilities: readonly Permission[] = permissionsForSubject(user),
): T & { capabilities: readonly Permission[] } {
  return { ...user, capabilities };
}

function publicAuthResult<T extends { user: AuthorizationSubject }>(
  result: T,
  req: IncomingMessage,
):
  | (Omit<T, "user"> & {
      user: T["user"] & { capabilities: readonly Permission[] };
    })
  | {
      user: T["user"] & { capabilities: readonly Permission[] };
    } {
  const projected = { ...result, user: authUserProjection(result.user) };
  return isNativeClient(req) ? projected : { user: projected.user };
}

export function registerAuthRoutes(routes: RouteRegistrar): void {
  routes.addRoute("GET", "/auth/me", PUBLIC, async ({ principal }) => {
    const user = await authService.getCurrentUser(principal);
    if (!user) return null;
    const facturationAccess = await invoicingService.productAccessForUser(
      user.id,
    );
    const facturationEnabled = facturationAccess.length > 0;
    const facturationOnly =
      facturationEnabled &&
      facturationAccess.every((access) => access.accessMode === "STANDALONE");
    const baselineProducts =
      user.enabledProducts ??
      (facturationOnly ? ([] as const) : (["marketplace"] as const));
    return {
      ...authUserProjection(user, principal.capabilities ?? []),
      enabledProducts: Array.from(
        new Set([
          ...baselineProducts,
          ...(facturationEnabled ? (["facturation"] as const) : []),
        ]),
      ),
    };
  });
  routes.addRoute(
    "POST",
    "/auth/domain-handoff/start",
    permission("marketplace.customer.access"),
    async ({ principal, body, marketCode }) => {
      if (
        !marketCode ||
        marketCode !== String(body?.sourceCountry || "").toUpperCase()
      ) {
        throw new AppError({
          code: "CONFLICT",
          message: "Le marché source ne correspond pas à la session courante.",
        });
      }
      return authService.beginDomainHandoff(principal, body || {});
    },
  );
  routes.addRoute(
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
      return {
        user: authUserProjection(result.user),
        returnTo: result.returnTo,
      };
    },
  );
  routes.addRoute("POST", "/auth/login", PUBLIC, async ({ body, req, res }) => {
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
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
    "POST",
    "/auth/logout",
    PUBLIC,
    async ({ principal, res }) => {
      await authService.logout(principal);
      clearSessionCookies(res);
      return { success: true };
    },
  );
  routes.addRoute(
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
  routes.addRoute(
    "POST",
    "/auth/logout-all",
    AUTHENTICATED,
    async ({ principal, body, res }) => {
      await authService.logoutAll(principal, Boolean(body?.keepCurrent));
      if (!body?.keepCurrent) clearSessionCookies(res);
      return { success: true };
    },
  );
  routes.addRoute(
    "GET",
    "/auth/sessions",
    AUTHENTICATED,
    async ({ principal }) => ({
      items: await authService.listSessions(principal),
    }),
  );
  routes.addRoute(
    "DELETE",
    "/auth/sessions/:id",
    AUTHENTICATED,
    async ({ principal, params, res }) => {
      await authService.revokeSession(principal, params.id);
      if (params.id === principal.sessionId) clearSessionCookies(res);
      return { success: true };
    },
  );
  routes.addRoute(
    "POST",
    "/auth/reauthenticate",
    AUTHENTICATED,
    async ({ principal, body }) =>
      authService.reauthenticate(principal, body?.password),
  );
  routes.addRoute("GET", "/auth/mfa", AUTHENTICATED, async ({ principal }) =>
    authService.getMfaStatus(principal),
  );
  routes.addRoute(
    "POST",
    "/auth/mfa/setup",
    AUTHENTICATED,
    async ({ principal }) => authService.beginMfaEnrollment(principal),
  );
  routes.addRoute(
    "POST",
    "/auth/mfa/confirm",
    AUTHENTICATED,
    async ({ principal, body }) =>
      authService.confirmMfaEnrollment(principal, body?.code),
  );
  routes.addRoute(
    "POST",
    "/auth/mfa/session-confirm",
    AUTHENTICATED,
    async ({ principal, body }) =>
      authService.verifySessionMfa(principal, body?.code),
  );
  routes.addRoute(
    "DELETE",
    "/auth/mfa",
    AUTHENTICATED,
    async ({ principal, body }) =>
      authService.disableMfa(principal, body?.code),
  );
  routes.addRoute(
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
  routes.addRoute(
    "POST",
    "/auth/password/add",
    AUTHENTICATED,
    async ({ principal, body }) => {
      await authService.addPassword(principal, body?.newPassword);
      return { success: true };
    },
  );
  routes.addRoute("GET", "/auth/oauth/providers", PUBLIC, async () =>
    socialAuthService.availability(),
  );
  routes.addRoute(
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
  routes.addRoute(
    "GET",
    "/auth/oauth/:provider/callback",
    PUBLIC,
    oauthCallback,
  );
  routes.addRoute(
    "POST",
    "/auth/oauth/:provider/callback",
    PUBLIC,
    oauthCallback,
  );
  routes.addRoute(
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
  routes.addRoute(
    "POST",
    "/auth/oauth/native-exchange",
    PUBLIC,
    async ({ body, req }) => {
      const result = await socialAuthService.exchangeNativeCode(
        body?.code,
        requestMetadata(req),
      );
      return {
        user: authUserProjection(result.user),
        ...result.tokens,
        returnTo: result.returnTo,
      };
    },
  );
  routes.addRoute(
    "GET",
    "/auth/security",
    AUTHENTICATED,
    async ({ principal }) =>
      socialAuthService.securityOverview(principal.userId, principal.sessionId),
  );
  routes.addRoute(
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
  routes.addRoute(
    "POST",
    "/auth/oauth/facebook/data-deletion",
    PUBLIC,
    async ({ body }) =>
      facebookDataDeletionService.request(body?.signed_request),
  );
  routes.addRoute(
    "GET",
    "/auth/oauth/facebook/data-deletion/status",
    PUBLIC,
    async ({ query }) =>
      facebookDataDeletionService.status(query.get("code") || ""),
  );
  routes.addRoute(
    "POST",
    "/auth/switch-role",
    permission("marketplace.customer.access"),
    async ({ principal, body }) =>
      authService.switchRole(principal, body?.role),
  );
  routes.addRoute(
    "POST",
    "/auth/verify-phone",
    permission("marketplace.customer.access"),
    async ({ principal, body }) => {
      const verified = await authService.verifyPhone(
        principal,
        body?.phone,
        body?.code,
      );
      return { verified };
    },
  );
  routes.addRoute("POST", "/auth/verify-email", PUBLIC, async ({ body }) => {
    const verified = await authService.verifyEmail(body?.token);
    return { verified };
  });
  routes.addRoute(
    "POST",
    "/auth/verify-email/resend",
    PUBLIC,
    async ({ body, req }) =>
      authService.sendEmailVerification(body?.email, requestMetadata(req)),
  );
  routes.addRoute(
    "POST",
    "/auth/password/forgot",
    PUBLIC,
    async ({ body, req }) =>
      authService.requestPasswordReset(body?.email, requestMetadata(req)),
  );
  routes.addRoute(
    "POST",
    "/auth/password/reset",
    PUBLIC,
    async ({ body, res }) => {
      await authService.resetPassword(body?.token, body?.newPassword);
      clearSessionCookies(res);
      return { success: true };
    },
  );
}
