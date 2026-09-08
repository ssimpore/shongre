import {
  type RouteRegistrar,
  PUBLIC,
  permission,
} from "../../../api/v1/route-contract.js";
import { coursesService } from "../courses.service.js";
import {
  requireOpenApiRequestMarket,
  requireApiRequestMarket,
} from "../../markets/request-market-context.js";
import { AppError } from "../../../shared/errors/app-error.js";

export function registerCoursesRoutes(routes: RouteRegistrar): void {
  routes.addRoute("GET", "/education/catalog", PUBLIC, async ({ marketCode }) =>
    coursesService.getCatalog(requireOpenApiRequestMarket(marketCode)),
  );
  routes.addRoute(
    "POST",
    "/education/search",
    PUBLIC,
    async ({ body, marketCode }) =>
      coursesService.searchTutors({
        ...(body || {}),
        marketCode: requireOpenApiRequestMarket(marketCode),
      }),
  );
  routes.addRoute(
    "GET",
    "/education/tutors/:id",
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
  routes.addRoute(
    "GET",
    "/education/favorites",
    permission("favorite.manage.own"),
    async ({ principal, marketCode }) => ({
      tutorProfileIds: await coursesService.getSavedTutorIds(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
    }),
  );
  routes.addRoute(
    "PUT",
    "/education/tutors/:id/favorite",
    permission("favorite.manage.own"),
    async ({ principal, params, marketCode, body }) => {
      if (typeof body?.isFavorite !== "boolean")
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "L’état favori demandé est invalide.",
        });
      return {
        isFavorite: await coursesService.setSavedTutor(
          principal.userId,
          params.id,
          requireApiRequestMarket(marketCode),
          body.isFavorite,
        ),
      };
    },
  );
  routes.addRoute(
    "GET",
    "/education/workflow-drafts/tutor-onboarding",
    permission("course.profile.manage.own"),
    async ({ principal, marketCode }) =>
      coursesService.getTutorOnboardingDraft(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "PUT",
    "/education/workflow-drafts/tutor-onboarding",
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
  routes.addRoute(
    "DELETE",
    "/education/workflow-drafts/tutor-onboarding",
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
  routes.addRoute(
    "POST",
    "/education/onboarding/submit",
    permission("course.profile.manage.own"),
    async ({ principal, body, marketCode }) =>
      coursesService.submitTutorOnboarding(
        principal.userId,
        requireApiRequestMarket(marketCode),
        body?.draft,
      ),
  );
  routes.addRoute(
    "GET",
    "/education/workflow-drafts/learner-request",
    permission("course.request.create"),
    async ({ principal, query, marketCode }) =>
      coursesService.getLearnerRequestDraft(
        principal.userId,
        requireApiRequestMarket(marketCode),
        query.get("subject") || "",
      ),
  );
  routes.addRoute(
    "PUT",
    "/education/workflow-drafts/learner-request",
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
  routes.addRoute(
    "DELETE",
    "/education/workflow-drafts/learner-request",
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
  routes.addRoute(
    "PUT",
    "/education/tutors/:id",
    permission("course.profile.manage.own"),
    async ({ principal, params, body }) =>
      coursesService.saveOwnTutorProfile(principal.userId, {
        ...body,
        id: params.id,
      }),
  );
  routes.addRoute(
    "POST",
    "/education/offers",
    permission("course.offer.manage.own"),
    async ({ principal, body }) =>
      coursesService.createOwnCourseOffer(principal.userId, body),
  );
  routes.addRoute(
    "POST",
    "/education/learner-requests",
    permission("course.request.create"),
    async ({ principal, body }) =>
      coursesService.submitLearnerRequest(principal.userId, body),
  );
  routes.addRoute(
    "GET",
    "/education/workspace",
    permission("course.lead.read.own"),
    async ({ principal, marketCode }) =>
      coursesService.getCurrentTutorWorkspace(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "GET",
    "/education/workspace/:tutorProfileId",
    permission("course.lead.read.own"),
    async ({ principal, params }) =>
      coursesService.getOwnTutorWorkspace(
        principal.userId,
        params.tutorProfileId,
      ),
  );
  routes.addRoute(
    "GET",
    "/education/organizations/workspace",
    permission("course.organization.manage.own"),
    async ({ principal, marketCode }) =>
      coursesService.getCurrentOrganizationWorkspace(
        principal.userId,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "GET",
    "/education/organizations/:organizationId/workspace",
    permission("course.organization.manage.own"),
    async ({ principal, params }) =>
      coursesService.getOwnOrganizationWorkspace(
        principal.userId,
        params.organizationId,
      ),
  );
  routes.addRoute(
    "POST",
    "/education/organizations/:organizationId/members",
    permission("course.organization.manage.own"),
    async ({ principal, params, body }) =>
      coursesService.inviteOrganizationMember(
        principal.userId,
        params.organizationId,
        body || {},
      ),
  );
  routes.addRoute(
    "POST",
    "/education/organizations/:organizationId/locations",
    permission("course.organization.manage.own"),
    async ({ principal, params, body }) =>
      coursesService.addOrganizationLocation(
        principal.userId,
        params.organizationId,
        body || {},
      ),
  );
  routes.addRoute(
    "PATCH",
    "/education/leads/:leadId",
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
  routes.addRoute(
    "POST",
    "/education/bookings",
    permission("course.booking.create"),
    async ({ principal, body, marketCode }) =>
      coursesService.createBooking(
        principal.userId,
        requireApiRequestMarket(marketCode),
        body?.booking,
      ),
  );
  routes.addRoute(
    "GET",
    "/education/admin/catalog",
    permission("course.admin.manage"),
    async ({ marketCode }) =>
      coursesService.getAdminCatalog(requireApiRequestMarket(marketCode)),
  );
  routes.addRoute(
    "PUT",
    "/education/admin/markets/:marketCode",
    permission("course.admin.manage"),
    async ({ params, body }) =>
      coursesService.updateMarketConfig(params.marketCode, body),
  );
  routes.addRoute(
    "PATCH",
    "/education/admin/markets/:marketCode/subjects/:subjectId",
    permission("course.admin.manage"),
    async ({ params, body }) =>
      coursesService.updateSubject(params.marketCode, params.subjectId, body),
  );
  routes.addRoute(
    "PATCH",
    "/education/admin/markets/:marketCode/plans/:planId",
    permission("course.admin.manage"),
    async ({ params, body }) =>
      coursesService.updatePlan(params.marketCode, params.planId, body),
  );
}
