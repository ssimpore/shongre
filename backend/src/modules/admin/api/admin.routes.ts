import {
  type TrendingAdminConfig,
  type TrendingTopicOverride,
} from "../../trending/trending.types.js";
import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { currenciesService } from "../../currencies/currencies.service.js";
import { marketsService } from "../../markets/markets.service.js";
import { deliveryService } from "../../delivery/delivery.service.js";
import {
  requireApiMarketContext,
  requireApiRequestMarket,
} from "../../markets/request-market-context.js";
import { businessRulesService } from "../../business-rules/business-rules.service.js";
import { commissionService } from "../../commission/commission.service.js";
import {
  requirePermission,
  requireRecentAuthentication,
} from "../../../shared/auth/principal.js";
import { unifiedDiscoveryService } from "../../discovery/discovery.service.js";
import { featureFlagService } from "../../feature-flags/feature-flag.service.js";
import { solutionsService } from "../../solutions/solutions.service.js";
import { providerControlPlaneService } from "../../providers/provider-control-plane.service.js";
import { adminService } from "../admin.service.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { complianceService } from "../../compliance/compliance.service.js";
import { moderationService } from "../../moderation/moderation.service.js";
import { homepageService } from "../../homepage/homepage.service.js";
import { taxonomyService } from "../../taxonomy/taxonomy.service.js";
import { trendingService } from "../../trending/trending.service.js";

function sanitizeTrendingConfigPatch(body: any): Partial<TrendingAdminConfig> {
  if (!body || typeof body !== "object") return {};
  const allowed = [
    "enabled",
    "selectionMode",
    "maxTopics",
    "listingsPerTopic",
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

export function registerAdminRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/admin/currencies",
    permission("market.manage"),
    async () => currenciesService.getAdminCatalog(),
  );
  routes.addRoute(
    "PUT",
    "/admin/currencies/:code",
    permission("market.configure"),
    async ({ principal, params, body }) =>
      currenciesService.upsertCurrency(params.code, body, principal.userId),
  );
  routes.addRoute(
    "PUT",
    "/admin/exchange-rates/:baseCurrency/:quoteCurrency",
    permission("market.configure"),
    async ({ principal, params, body }) =>
      currenciesService.upsertExchangeRate(
        params.baseCurrency,
        params.quoteCurrency,
        body,
        principal.userId,
      ),
  );
  routes.addRoute(
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
  routes.addRoute(
    "GET",
    "/admin/countries/:code/changes",
    permission("market.manage"),
    async ({ params }) =>
      marketsService.listCountryConfigurationChanges(params.code),
  );
  routes.addRoute(
    "POST",
    "/admin/countries/:code/changes/:id/approve",
    permission("market.configure"),
    async ({ principal, params, body }) =>
      marketsService.approveCountryConfigurationChange(
        params.id,
        principal.userId,
        body,
      ),
  );
  routes.addRoute(
    "POST",
    "/admin/countries/:code/changes/:id/reject",
    permission("market.configure"),
    async ({ principal, params, body }) =>
      marketsService.rejectCountryConfigurationChange(
        params.id,
        principal.userId,
        body,
      ),
  );
  routes.addRoute(
    "GET",
    "/admin/delivery/requests",
    permission("delivery.admin.manage"),
    async ({ principal, marketCode }) =>
      deliveryService.adminList(principal, requireApiMarketContext(marketCode)),
  );
  routes.addRoute(
    "POST",
    "/admin/delivery/requests/:requestId/suspend",
    permission("delivery.moderate"),
    async ({ principal, params, body, marketCode }) =>
      deliveryService.suspendUnsafe(
        principal,
        requireApiMarketContext(marketCode),
        params.requestId,
        body,
      ),
  );
  routes.addRoute(
    "GET",
    "/admin/business-rules",
    permission("commercial_rules.read"),
    async ({ marketCode }) =>
      businessRulesService.getAdminOverviewForContext(
        requireApiMarketContext(marketCode),
      ),
  );
  routes.addRoute(
    "POST",
    "/admin/business-rules/simulate",
    permission("commercial_rules.read"),
    async ({ body, marketCode }) =>
      businessRulesService.evaluateForContext(
        body,
        requireApiMarketContext(marketCode),
      ),
  );
  routes.addRoute(
    "POST",
    "/admin/commissions/simulate",
    permission("commissions.simulate"),
    async ({ body }) => commissionService.preview(body),
  );
  routes.addRoute(
    "GET",
    "/admin/commissions/calculations/:id",
    permission("commissions.read"),
    async ({ params }) => commissionService.getCalculation(params.id),
  );
  routes.addRoute(
    "POST",
    "/admin/commissions/calculations/:id/reversals",
    permission("commissions.manage"),
    async ({ params, body }) => commissionService.reverse(params.id, body),
  );
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
    "POST",
    "/admin/discovery/explain",
    permission("commercial_rules.read"),
    async ({ body }) =>
      unifiedDiscoveryService.explainListing(
        body?.listingId,
        body?.filters || {},
      ),
  );
  routes.addRoute(
    "GET",
    "/admin/discovery/metrics",
    permission("commercial_rules.read"),
    async ({ query, marketCode }) =>
      unifiedDiscoveryService.getMetrics(
        requireApiRequestMarket(marketCode),
        query.get("since") || undefined,
      ),
  );
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
    "POST",
    "/admin/business-rules/drafts",
    permission("commercial_rules.edit"),
    async ({ principal, body }) =>
      businessRulesService.createDraft(principal.userId, body),
  );
  routes.addRoute(
    "POST",
    "/admin/monetization/complimentary-grants/requests",
    permission("monetization.complimentary_grants.request"),
    async ({ principal, body }) =>
      businessRulesService.requestComplimentaryGrant(principal.userId, body),
  );
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
    "GET",
    "/admin/feature-flags",
    permission("admin.configuration.manage"),
    async ({ principal }) => featureFlagService.getAdminSnapshot(principal),
  );
  routes.addRoute(
    "PUT",
    "/admin/feature-flags/:key",
    permission("admin.configuration.manage"),
    async ({ principal, params, body }) =>
      featureFlagService.upsertDefinition(principal, params.key, body),
  );
  routes.addRoute(
    "PUT",
    "/admin/feature-flags/:key/rules/:ruleId",
    permission("admin.configuration.manage"),
    async ({ principal, params, body }) =>
      featureFlagService.upsertRule(principal, params.key, params.ruleId, body),
  );
  routes.addRoute(
    "GET",
    "/admin/solutions",
    permission("admin.configuration.manage"),
    async ({ principal }) => solutionsService.listAdminSolutions(principal),
  );
  routes.addRoute(
    "POST",
    "/admin/solutions",
    permission("admin.configuration.manage"),
    async ({ principal, body, req }) =>
      solutionsService.createSolution(
        principal,
        body,
        req.headers["idempotency-key"],
      ),
  );
  routes.addRoute(
    "PUT",
    "/admin/solutions/order",
    permission("admin.configuration.manage"),
    async ({ principal, body, req }) =>
      solutionsService.reorderSolutions(
        principal,
        body,
        req.headers["idempotency-key"],
      ),
  );
  routes.addRoute(
    "PATCH",
    "/admin/solutions/:solutionId",
    permission("admin.configuration.manage"),
    async ({ principal, params, body, req }) =>
      solutionsService.updateSolution(
        principal,
        params.solutionId,
        body,
        req.headers["idempotency-key"],
      ),
  );
  routes.addRoute(
    "POST",
    "/admin/solutions/:solutionId/lifecycle",
    permission("admin.configuration.manage"),
    async ({ principal, params, body, req }) =>
      solutionsService.transitionLifecycle(
        principal,
        params.solutionId,
        body,
        req.headers["idempotency-key"],
      ),
  );
  routes.addRoute(
    "GET",
    "/admin/solutions/:solutionId/lifecycle-history",
    permission("admin.configuration.manage"),
    async ({ principal, params }) =>
      solutionsService.listLifecycleHistory(principal, params.solutionId),
  );
  routes.addRoute(
    "GET",
    "/admin/providers/control-plane",
    permission("provider.read"),
    async () => providerControlPlaneService.getSnapshot(),
  );
  routes.addRoute(
    "POST",
    "/admin/providers/:providerId/test",
    permission("provider.test"),
    async ({ params }) =>
      providerControlPlaneService.testProvider(params.providerId),
  );
  routes.addRoute(
    "GET",
    "/admin/stats",
    permission("admin.configuration.manage"),
    async () => adminService.getPlatformStats(),
  );
  routes.addRoute("GET", "/admin/users", permission("user.read"), async () =>
    adminService.getAllUsers(),
  );
  routes.addRoute(
    "GET",
    "/admin/users/:userId/capabilities",
    permission("admin.permissions.manage"),
    async ({ principal, params }) => {
      requireRecentAuthentication(principal);
      return adminService.getCapabilityOverrides({
        userId: params.userId,
        actor: principal,
      });
    },
  );
  routes.addRoute(
    "PUT",
    "/admin/users/:userId/capability-overrides",
    permission("admin.permissions.manage"),
    async ({ principal, params, body, requestId }) => {
      requireRecentAuthentication(principal);
      return adminService.updateCapabilityOverrides({
        userId: params.userId,
        customPermissions: body?.customPermissions,
        revokedPermissions: body?.revokedPermissions,
        reason: body?.reason,
        expectedVersion: body?.expectedVersion,
        actor: principal,
        requestId,
      });
    },
  );
  routes.addRoute(
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
      return adminService.updateUserStatus({
        userId: params.userId,
        status: body?.status,
        reason: body?.reason,
        actor: principal,
      });
    },
  );
  routes.addRoute(
    "PUT",
    "/admin/users/:userId/staff-status",
    permission("admin.staff.manage"),
    async ({ principal, params, body }) => {
      requireRecentAuthentication(principal);
      return adminService.updateStaffStatus({
        userId: params.userId,
        status: body?.status,
        staffRole: body?.staffRole,
        reason: body?.reason,
        actor: principal,
      });
    },
  );
  routes.addRoute(
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
  routes.addRoute(
    "GET",
    "/admin/compliance/rules",
    permission("compliance.policy.read"),
    async () => complianceService.listRules(),
  );
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
    "POST",
    "/admin/compliance/retention/run",
    permission("compliance.retention.manage"),
    async ({ principal }) =>
      complianceService.runApprovedRetention(principal.userId),
  );
  routes.addRoute(
    "GET",
    "/admin/compliance/users/:userId/status",
    permission("compliance.sensitive.read"),
    async ({ params }) => complianceService.getSubject(params.userId),
  );
  routes.addRoute(
    "POST",
    "/admin/compliance/users/:userId/requirements",
    permission("compliance.review"),
    async ({ params, body }) =>
      complianceService.evaluateForUser(params.userId, body),
  );
  routes.addRoute(
    "GET",
    "/admin/compliance/reviews",
    permission("compliance.review"),
    async ({ query }) =>
      complianceService.listManualReviews(
        (query.get("state") || undefined) as any,
      ),
  );
  routes.addRoute(
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
  routes.addRoute(
    "GET",
    "/admin/reports",
    permission("report.review"),
    async () => adminService.getPendingReports(),
  );
  routes.addRoute(
    "GET",
    "/admin/moderation/cases",
    permission("moderation.review"),
    async ({ query }) => ({
      items: await moderationService.listCases(
        query.get("status") || undefined,
      ),
    }),
  );
  routes.addRoute(
    "GET",
    "/admin/moderation/appeals",
    permission("moderation.review"),
    async ({ query }) => ({
      items: await moderationService.listAppeals(
        query.get("status") || undefined,
      ),
    }),
  );
  routes.addRoute(
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
  routes.addRoute(
    "POST",
    "/admin/reports/:reportId/resolve",
    permission("report.review"),
    async ({ principal, params, body }) => {
      await adminService.resolveReport({
        reportId: params.reportId,
        action: body?.action,
        reason: body?.reason,
        actor: principal,
      });
      return { success: true };
    },
  );
  routes.addRoute(
    "GET",
    "/admin/audit-logs",
    permission("audit.read"),
    async () => adminService.getAuditLogs(),
  );
  routes.addRoute(
    "GET",
    "/admin/homepage/configuration",
    permission("admin.configuration.manage"),
    async ({ query, marketCode }) =>
      homepageService.getDraft(
        requireApiRequestMarket(marketCode),
        query.get("locale") || "fr-FR",
      ),
  );
  routes.addRoute(
    "GET",
    "/admin/taxonomy/header-navigation",
    permission("taxonomy.manage"),
    async ({ marketCode }) =>
      taxonomyService.getHeaderNavigation(
        requireApiMarketContext(marketCode),
        true,
      ),
  );
  routes.addRoute(
    "PUT",
    "/admin/taxonomy/header-navigation",
    permission("taxonomy.manage"),
    async ({ principal, body, marketCode, requestId }) =>
      taxonomyService.saveHeaderNavigation(body, {
        marketContext: requireApiMarketContext(marketCode),
        actorProfileId: principal.userId,
        requestId,
      }),
  );
  routes.addRoute(
    "PUT",
    "/admin/homepage/configuration",
    permission("admin.configuration.manage"),
    async ({ principal, body, query, marketCode }) => {
      const resolvedMarket = requireApiRequestMarket(marketCode);
      const locale = query.get("locale") || "fr-FR";
      if (
        body?.configuration?.marketCode !== resolvedMarket ||
        body?.configuration?.locale !== locale
      ) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Le brouillon ne correspond pas au marché demandé.",
        });
      }
      return homepageService.saveDraft({
        configuration: body?.configuration,
        actorId: principal.userId,
        changeReason: String(body?.changeReason || ""),
      });
    },
  );
  routes.addRoute(
    "POST",
    "/admin/homepage/preview",
    permission("admin.configuration.manage"),
    async ({ body, query, marketCode }) =>
      homepageService.preview(body?.configuration, {
        marketCode: requireApiRequestMarket(marketCode),
        locale: query.get("locale") || "fr-FR",
        region: query.get("region") || undefined,
        city: query.get("city") || undefined,
      }),
  );
  routes.addRoute(
    "POST",
    "/admin/homepage/publish",
    permission("admin.configuration.manage"),
    async ({ principal, body, query, marketCode }) => {
      const resolvedMarket = requireApiRequestMarket(marketCode);
      const locale = query.get("locale") || "fr-FR";
      if (body?.marketCode !== resolvedMarket || body?.locale !== locale) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "La publication ne correspond pas au marché demandé.",
        });
      }
      return homepageService.publish({
        marketCode: resolvedMarket,
        locale,
        actorId: principal.userId,
        changeReason: String(body?.changeReason || ""),
      });
    },
  );
  routes.addRoute(
    "GET",
    "/admin/trending/config",
    permission("admin.configuration.manage"),
    async ({ marketCode }) =>
      trendingService.getConfig(requireApiRequestMarket(marketCode)),
  );
  routes.addRoute(
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
  routes.addRoute(
    "PUT",
    "/admin/trending/overrides/:topicKey",
    permission("admin.configuration.manage"),
    async ({ params, body, marketCode }) =>
      trendingService.upsertOverride(requireApiRequestMarket(marketCode), {
        ...sanitizeTrendingOverride(body),
        topicKey: params.topicKey,
      }),
  );
}
