import {
  type RouteRegistrar,
  PUBLIC,
  permission,
} from "../../../api/v1/route-contract.js";
import { marketingService } from "../marketing.service.js";
import { marketingTrackingService } from "../marketing-tracking.service.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { marketingProviderWebhookService } from "../marketing-provider-webhook.service.js";
import { marketingOperationsService } from "../marketing-operations.service.js";

export function registerMarketingRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "POST",
    "/marketing/public/subscriptions",
    PUBLIC,
    async ({ body }) => marketingService.subscribePublic(body),
  );
  routes.addRoute(
    "POST",
    "/marketing/public/confirm",
    PUBLIC,
    async ({ body }) => marketingService.confirmPublic(body),
  );
  routes.addRoute(
    "GET",
    "/marketing/public/preferences",
    PUBLIC,
    async ({ query }) =>
      marketingService.getPublicPreferences(query.get("token") ?? ""),
  );
  routes.addRoute(
    "PUT",
    "/marketing/public/preferences",
    PUBLIC,
    async ({ body }) => marketingService.updatePublicPreferences(body),
  );
  routes.addRoute(
    "POST",
    "/marketing/public/unsubscribe",
    PUBLIC,
    async ({ body }) => marketingService.unsubscribePublic(body),
  );
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
    "GET",
    "/marketing/account/subscription",
    permission("marketplace.customer.access"),
    async ({ principal, query }) =>
      marketingService.getAccountSubscription(
        principal,
        query.get("marketCode") ?? undefined,
      ),
  );
  routes.addRoute(
    "POST",
    "/marketing/account/subscription",
    permission("marketplace.customer.access"),
    async ({ principal, body }) =>
      marketingService.subscribeAccount(principal, body),
  );
  routes.addRoute(
    "PUT",
    "/marketing/account/preferences",
    permission("marketplace.customer.access"),
    async ({ principal, body }) =>
      marketingService.updateAccountPreferences(principal, body),
  );
  routes.addRoute(
    "POST",
    "/marketing/account/unsubscribe",
    permission("marketplace.customer.access"),
    async ({ principal, body }) =>
      marketingService.unsubscribeAccount(principal, body?.marketCode),
  );
  routes.addRoute(
    "GET",
    "/marketing/dashboard",
    permission("marketing.dashboard.read"),
    async ({ principal }) => marketingService.dashboard(principal),
  );
  routes.addRoute(
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
  routes.addRoute(
    "POST",
    "/marketing/profiles",
    permission("marketing.profiles.manage"),
    async ({ principal, body }) =>
      marketingService.createProfile(principal, body),
  );
  routes.addRoute(
    "POST",
    "/marketing/profiles/:profileId/confirm",
    permission("marketing.profiles.manage"),
    async ({ principal, params }) =>
      marketingService.confirmProfile(principal, params.profileId),
  );
  routes.addRoute(
    "POST",
    "/marketing/profiles/:profileId/unsubscribe",
    permission("marketing.profiles.manage"),
    async ({ principal, params }) =>
      marketingService.unsubscribeProfile(principal, params.profileId),
  );
  routes.addRoute(
    "GET",
    "/marketing/lists",
    permission("marketing.lists.read"),
    async ({ principal }) => marketingService.listLists(principal),
  );
  routes.addRoute(
    "POST",
    "/marketing/lists",
    permission("marketing.lists.manage"),
    async ({ principal, body }) => marketingService.createList(principal, body),
  );
  routes.addRoute(
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
  routes.addRoute(
    "GET",
    "/marketing/segments",
    permission("marketing.segments.read"),
    async ({ principal }) => marketingService.listSegments(principal),
  );
  routes.addRoute(
    "POST",
    "/marketing/segments",
    permission("marketing.segments.manage"),
    async ({ principal, body }) =>
      marketingService.createSegment(principal, body),
  );
  routes.addRoute(
    "GET",
    "/marketing/templates",
    permission("marketing.templates.read"),
    async ({ principal }) => marketingService.listTemplates(principal),
  );
  routes.addRoute(
    "POST",
    "/marketing/templates",
    permission("marketing.templates.manage"),
    async ({ principal, body }) =>
      marketingService.createTemplate(principal, body),
  );
  routes.addRoute(
    "GET",
    "/marketing/campaigns",
    permission("marketing.campaigns.read"),
    async ({ principal }) => marketingService.listCampaigns(principal),
  );
  routes.addRoute(
    "POST",
    "/marketing/campaigns/audience-estimate",
    permission("marketing.campaigns.read"),
    async ({ principal, body }) =>
      marketingService.estimateAudience(principal, body),
  );
  routes.addRoute(
    "POST",
    "/marketing/ai/campaign-draft",
    permission("marketing.campaigns.create"),
    async ({ principal, body }) =>
      marketingService.generateCampaignDraft(principal, body),
  );
  routes.addRoute(
    "POST",
    "/marketing/campaigns",
    permission("marketing.campaigns.create"),
    async ({ principal, body }) =>
      marketingService.createCampaign(principal, body),
  );
  routes.addRoute(
    "GET",
    "/marketing/campaigns/:campaignId",
    permission("marketing.campaigns.read"),
    async ({ principal, params }) =>
      marketingService.getCampaign(principal, params.campaignId),
  );
  routes.addRoute(
    "POST",
    "/marketing/campaigns/:campaignId/preflight",
    permission("marketing.campaigns.read"),
    async ({ principal, params }) =>
      marketingService.preflight(principal, params.campaignId),
  );
  routes.addRoute(
    "POST",
    "/marketing/campaigns/:campaignId/test-send",
    permission("marketing.campaigns.send"),
    async ({ principal, params, body }) =>
      marketingService.testSend(principal, params.campaignId, body),
  );
  routes.addRoute(
    "POST",
    "/marketing/campaigns/:campaignId/send",
    permission("marketing.campaigns.send"),
    async ({ principal, params }) =>
      marketingService.send(principal, params.campaignId),
  );
  routes.addRoute(
    "POST",
    "/marketing/campaigns/:campaignId/schedule",
    permission("marketing.campaigns.send"),
    async ({ principal, params, body }) =>
      marketingService.schedule(principal, params.campaignId, body),
  );
  routes.addRoute(
    "POST",
    "/marketing/campaigns/:campaignId/pause",
    permission("marketing.campaigns.pause"),
    async ({ principal, params }) =>
      marketingService.pause(principal, params.campaignId),
  );
  routes.addRoute(
    "POST",
    "/marketing/campaigns/:campaignId/resume",
    permission("marketing.campaigns.pause"),
    async ({ principal, params }) =>
      marketingService.resume(principal, params.campaignId),
  );
  routes.addRoute(
    "POST",
    "/marketing/campaigns/:campaignId/review",
    permission("marketing.campaigns.update"),
    async ({ principal, params }) =>
      marketingService.submitForReview(principal, params.campaignId),
  );
  routes.addRoute(
    "POST",
    "/marketing/campaigns/:campaignId/approve",
    permission("marketing.campaigns.approve"),
    async ({ principal, params }) =>
      marketingService.approve(principal, params.campaignId),
  );
  routes.addRoute(
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
  routes.addRoute(
    "POST",
    "/marketing/campaigns/:campaignId/cancel",
    permission("marketing.campaigns.cancel"),
    async ({ principal, params }) =>
      marketingService.cancel(principal, params.campaignId),
  );
  routes.addRoute(
    "GET",
    "/marketing/suppressions",
    permission("marketing.compliance.read"),
    async ({ principal }) => marketingService.listSuppressions(principal),
  );
  routes.addRoute(
    "GET",
    "/marketing/analytics",
    permission("marketing.analytics.read"),
    async ({ principal, query }) =>
      marketingOperationsService.analytics(
        principal,
        query.get("campaignId") ?? undefined,
      ),
  );
  routes.addRoute(
    "POST",
    "/marketing/conversions",
    permission("marketing.campaigns.update"),
    async ({ principal, body }) =>
      marketingOperationsService.recordConversion(principal, body),
  );
  routes.addRoute(
    "GET",
    "/marketing/usage",
    permission("marketing.dashboard.read"),
    async ({ principal }) => marketingOperationsService.usage(principal),
  );
  routes.addRoute(
    "GET",
    "/marketing/journeys",
    permission("marketing.automation.read"),
    async ({ principal }) => marketingOperationsService.listJourneys(principal),
  );
  routes.addRoute(
    "POST",
    "/marketing/journeys",
    permission("marketing.automation.manage"),
    async ({ principal, body }) =>
      marketingOperationsService.createJourney(principal, body),
  );
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
    "POST",
    "/marketing/journeys/events",
    permission("marketing.automation.manage"),
    async ({ principal, body }) =>
      marketingOperationsService.emitJourneyEvent(principal, body),
  );
  routes.addRoute(
    "GET",
    "/marketing/journey-executions",
    permission("marketing.automation.read"),
    async ({ principal, query }) =>
      marketingOperationsService.listJourneyExecutions(
        principal,
        query.get("journeyId") ?? undefined,
      ),
  );
  routes.addRoute(
    "GET",
    "/marketing/webhooks",
    permission("marketing.settings.manage"),
    async ({ principal }) =>
      marketingOperationsService.listWebhookSubscriptions(principal),
  );
  routes.addRoute(
    "POST",
    "/marketing/webhooks",
    permission("marketing.settings.manage"),
    async ({ principal, body }) =>
      marketingOperationsService.createWebhookSubscription(principal, body),
  );
  routes.addRoute(
    "POST",
    "/marketing/ai/assist",
    permission("marketing.campaigns.create"),
    async ({ principal, body }) =>
      marketingOperationsService.aiAssist(principal, body),
  );
}
