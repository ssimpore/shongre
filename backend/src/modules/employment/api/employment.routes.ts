import {
  type RouteRegistrar,
  PUBLIC,
  permission,
} from "../../../api/v1/route-contract.js";
import { employmentService } from "../employment.service.js";
import {
  requireOpenApiRequestMarket,
  requireApiRequestMarket,
} from "../../markets/request-market-context.js";
import { AppError } from "../../../shared/errors/app-error.js";

export function registerEmploymentRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/employment/catalog",
    PUBLIC,
    async ({ marketCode }) =>
      employmentService.getCatalog(requireOpenApiRequestMarket(marketCode)),
  );
  routes.addRoute(
    "POST",
    "/employment/search",
    PUBLIC,
    async ({ body, marketCode }) =>
      employmentService.search({
        ...(body || {}),
        marketCode: requireOpenApiRequestMarket(marketCode),
      }),
  );
  routes.addRoute(
    "GET",
    "/employment/jobs/:id",
    PUBLIC,
    async ({ params, marketCode }) => {
      const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
      const job = await employmentService.getPublicJob(
        params.id,
        resolvedMarketCode,
      );
      if (job.marketCode !== resolvedMarketCode)
        throw new AppError({
          code: "NOT_FOUND",
          message: "Offre d’emploi introuvable sur ce marché.",
        });
      return job;
    },
  );
  routes.addRoute(
    "GET",
    "/employment/jobs/:id/similar",
    PUBLIC,
    async ({ params, marketCode }) => {
      const resolvedMarketCode = requireOpenApiRequestMarket(marketCode);
      const job = await employmentService.getPublicJob(
        params.id,
        resolvedMarketCode,
      );
      if (job.marketCode !== resolvedMarketCode)
        throw new AppError({
          code: "NOT_FOUND",
          message: "Offre d’emploi introuvable sur ce marché.",
        });
      return employmentService.getSimilarJobs(job.id);
    },
  );
  routes.addRoute(
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
  routes.addRoute(
    "GET",
    "/employment/drafts/:id",
    permission("employment.job.manage.own"),
    async ({ principal, params }) =>
      employmentService.getOwnDraft(principal.userId, params.id),
  );
  routes.addRoute(
    "PUT",
    "/employment/drafts/:id",
    permission("employment.job.manage.own"),
    async ({ principal, params, body }) =>
      employmentService.saveOwnDraft(principal.userId, params.id, body),
  );
  routes.addRoute(
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
  routes.addRoute(
    "POST",
    "/employment/drafts/:id/duplicate-check",
    permission("employment.job.manage.own"),
    async ({ principal, params }) =>
      employmentService.checkDuplicateDraft(principal.userId, params.id),
  );
  routes.addRoute(
    "POST",
    "/employment/drafts/:id/submit",
    permission("employment.job.manage.own"),
    async ({ principal, params }) =>
      employmentService.submitOwnDraft(principal.userId, params.id),
  );
  routes.addRoute(
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
  routes.addRoute(
    "GET",
    "/employment/candidate/workspace",
    permission("employment.candidate.manage.own"),
    async ({ principal, marketCode }) =>
      employmentService.getOwnCandidateWorkspace(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "PUT",
    "/employment/candidate/profile",
    permission("employment.candidate.manage.own"),
    async ({ principal, body }) =>
      employmentService.saveOwnCandidateProfile(principal.userId, body),
  );
  routes.addRoute(
    "POST",
    "/employment/jobs/:id/applications",
    permission("employment.candidate.manage.own"),
    async ({ principal, params, body }) =>
      employmentService.apply(principal.userId, params.id, body),
  );
  routes.addRoute(
    "POST",
    "/employment/applications/:id/withdraw",
    permission("employment.candidate.manage.own"),
    async ({ principal, params }) =>
      employmentService.withdrawOwnApplication(principal.userId, params.id),
  );
  routes.addRoute(
    "GET",
    "/employment/favorites",
    permission("employment.candidate.manage.own"),
    async ({ principal, marketCode }) => ({
      jobIds: await employmentService.getSavedJobIds(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
    }),
  );
  routes.addRoute(
    "PUT",
    "/employment/jobs/:id/save",
    permission("employment.candidate.manage.own"),
    async ({ principal, params, marketCode, body }) => {
      if (typeof body?.isFavorite !== "boolean")
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "L’état favori demandé est invalide.",
        });
      return {
        isFavorite: await employmentService.setSavedJob(
          principal.userId,
          params.id,
          requireApiRequestMarket(marketCode),
          body.isFavorite,
        ),
      };
    },
  );
  routes.addRoute(
    "POST",
    "/employment/jobs/:id/report",
    permission("employment.candidate.manage.own"),
    async ({ principal, params, body }) =>
      employmentService.reportJob(principal.userId, params.id, body),
  );
  routes.addRoute(
    "POST",
    "/employment/candidate/alerts",
    permission("employment.candidate.manage.own"),
    async ({ principal, body }) =>
      employmentService.saveOwnJobAlert(principal.userId, body),
  );
  routes.addRoute(
    "DELETE",
    "/employment/candidate/alerts/:id",
    permission("employment.candidate.manage.own"),
    async ({ principal, params }) =>
      employmentService.deleteOwnJobAlert(principal.userId, params.id),
  );
  routes.addRoute(
    "POST",
    "/employment/candidate/data-export",
    permission("employment.candidate.manage.own"),
    async ({ principal }) =>
      employmentService.exportOwnCandidateData(principal.userId),
  );
  routes.addRoute(
    "POST",
    "/employment/candidate/deletion-request",
    permission("employment.candidate.manage.own"),
    async ({ principal }) =>
      employmentService.requestOwnCandidateDeletion(principal.userId),
  );
  routes.addRoute(
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
  routes.addRoute(
    "GET",
    "/employment/recruiter/employers",
    permission("employment.recruiter.manage.own"),
    async ({ principal }) =>
      employmentService.listOwnRecruiterEmployers(principal.userId),
  );
  routes.addRoute(
    "GET",
    "/employment/employers/:employerId/workspace",
    permission("employment.recruiter.manage.own"),
    async ({ principal, params, marketCode }) =>
      employmentService.getOwnRecruiterWorkspace(
        principal.userId,
        params.employerId,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
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
  routes.addRoute(
    "POST",
    "/employment/employers/:employerId/imports/preview",
    permission("employment.import.own"),
    async ({ principal, params, body, marketCode }) =>
      employmentService.previewImport(
        principal.userId,
        params.employerId,
        body,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "POST",
    "/employment/employers/:employerId/imports",
    permission("employment.import.own"),
    async ({ principal, params, body, marketCode }) =>
      employmentService.requestImport(
        principal.userId,
        params.employerId,
        body,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "POST",
    "/employment/checkouts",
    permission("payment.initiate"),
    async ({ principal, body }) =>
      employmentService.createCheckout(principal.userId, body),
  );
  routes.addRoute(
    "GET",
    "/employment/admin/overview",
    permission("employment.admin.manage"),
    async ({ marketCode }) =>
      employmentService.getAdminOverview(requireApiRequestMarket(marketCode)),
  );
  routes.addRoute(
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
  routes.addRoute(
    "PATCH",
    "/employment/admin/offers/:offerId",
    permission("employment.admin.manage"),
    async ({ principal, params, body }) =>
      employmentService.updateOffer(principal.userId, params.offerId, body),
  );
}
