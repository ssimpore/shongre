import type {
  CourseLead,
  CourseMarketConfig,
  CourseOffer,
  CoursePublicOffer,
  CourseOrganizationWorkspace,
  CoursePlan,
  LearnerRequest,
  TutorProfile,
  TutorPublicProfile,
  TutorSearchQuery,
  TutorSearchResponse,
  TutorWorkspace,
  CourseCatalog,
} from "@shongre/contracts/courses";
import type {
  CourseOfferDraft,
  CourseOrganizationInviteInput,
  CourseOrganizationLocationInput,
  CoursesServiceContract,
  LearnerRequestDraft,
  LearnerRequestProgressDraft,
  TutorProfileDraft,
  TutorOnboardingDraft,
} from "../../contracts/courses.contract";
import { apiOperation } from "./generated-api-operation";

export class HttpCoursesService implements CoursesServiceContract {
  getCatalog(marketCode: string): Promise<CourseCatalog> {
    return apiOperation<CourseCatalog, "getEducationCatalog">(
      "getEducationCatalog",
      {
        query: { market: marketCode },
      },
    );
  }

  getAdminCatalog(marketCode: string): Promise<CourseCatalog> {
    return apiOperation<CourseCatalog, "getEducationAdminCatalog">(
      "getEducationAdminCatalog",
      {
        query: { market: marketCode },
      },
    );
  }

  searchTutors(query: TutorSearchQuery): Promise<TutorSearchResponse> {
    return apiOperation<TutorSearchResponse, "postEducationSearch">(
      "postEducationSearch",
      { body: query },
    );
  }

  getTutorProfile(idOrSlug: string, marketCode: string) {
    return apiOperation<
      {
        tutor: TutorPublicProfile;
        offers: CoursePublicOffer[];
      },
      "getEducationTutorsById"
    >("getEducationTutorsById", {
      path: { id: idOrSlug },
      headers: { "X-Shongre-Market": marketCode },
    });
  }

  saveTutorProfile(profile: TutorProfileDraft): Promise<TutorProfile> {
    const id = profile.id || "new";
    return apiOperation<TutorProfile, "putEducationTutorsById">(
      "putEducationTutorsById",
      {
        path: { id },
        body: profile,
      },
    );
  }

  createCourseOffer(offer: CourseOfferDraft): Promise<CourseOffer> {
    return apiOperation<CourseOffer, "postEducationOffers">(
      "postEducationOffers",
      { body: offer },
    );
  }

  submitLearnerRequest(request: LearnerRequestDraft): Promise<LearnerRequest> {
    return apiOperation<LearnerRequest, "postEducationLearnerRequests">(
      "postEducationLearnerRequests",
      { body: request },
    );
  }

  getTutorOnboardingDraft(marketCode: string): Promise<TutorOnboardingDraft> {
    return apiOperation<
      TutorOnboardingDraft,
      "getEducationWorkflowdraftsTutoronboarding"
    >("getEducationWorkflowdraftsTutoronboarding", {
      query: { market: marketCode },
    });
  }

  saveTutorOnboardingDraft(
    marketCode: string,
    draft: TutorOnboardingDraft,
  ): Promise<void> {
    return apiOperation<void, "putEducationWorkflowdraftsTutoronboarding">(
      "putEducationWorkflowdraftsTutoronboarding",
      {
        body: {
          marketCode,
          draft,
        },
      },
    );
  }

  submitTutorOnboarding(
    marketCode: string,
    draft: TutorOnboardingDraft,
  ): Promise<{ profile: TutorProfile; offer: CourseOffer }> {
    return apiOperation<
      { profile: TutorProfile; offer: CourseOffer },
      "postEducationOnboardingSubmit"
    >("postEducationOnboardingSubmit", {
      body: { marketCode, draft },
    });
  }

  async clearTutorOnboardingDraft(marketCode: string): Promise<void> {
    await apiOperation<void, "deleteEducationWorkflowdraftsTutoronboarding">(
      "deleteEducationWorkflowdraftsTutoronboarding",
      {
        query: { market: marketCode },
      },
    );
  }

  getLearnerRequestDraft(
    marketCode: string,
    subjectId?: string,
  ): Promise<LearnerRequestProgressDraft> {
    return apiOperation<
      LearnerRequestProgressDraft,
      "getEducationWorkflowdraftsLearnerrequest"
    >("getEducationWorkflowdraftsLearnerrequest", {
      query: { market: marketCode, subject: subjectId },
    });
  }

  saveLearnerRequestDraft(
    marketCode: string,
    draft: LearnerRequestProgressDraft,
  ): Promise<void> {
    return apiOperation<void, "putEducationWorkflowdraftsLearnerrequest">(
      "putEducationWorkflowdraftsLearnerrequest",
      {
        body: {
          marketCode,
          draft,
        },
      },
    );
  }

  async clearLearnerRequestDraft(marketCode: string): Promise<void> {
    await apiOperation<void, "deleteEducationWorkflowdraftsLearnerrequest">(
      "deleteEducationWorkflowdraftsLearnerrequest",
      {
        query: { market: marketCode },
      },
    );
  }

  getCurrentTutorWorkspace(marketCode: string): Promise<TutorWorkspace> {
    return apiOperation<TutorWorkspace, "getEducationCurrentTutorWorkspace">(
      "getEducationCurrentTutorWorkspace",
      {
        headers: { "X-Shongre-Market": marketCode },
      },
    );
  }

  getTutorWorkspace(tutorProfileId: string): Promise<TutorWorkspace> {
    return apiOperation<
      TutorWorkspace,
      "getEducationWorkspaceByTutorProfileId"
    >("getEducationWorkspaceByTutorProfileId", {
      path: { tutorProfileId },
    });
  }

  getCurrentOrganizationWorkspace(
    marketCode: string,
  ): Promise<CourseOrganizationWorkspace> {
    return apiOperation<
      CourseOrganizationWorkspace,
      "getEducationCurrentOrganizationWorkspace"
    >("getEducationCurrentOrganizationWorkspace", {
      headers: { "X-Shongre-Market": marketCode },
    });
  }

  getOrganizationWorkspace(
    organizationId: string,
  ): Promise<CourseOrganizationWorkspace> {
    return apiOperation<
      CourseOrganizationWorkspace,
      "getEducationOrganizationsByOrganizationIdWorkspace"
    >("getEducationOrganizationsByOrganizationIdWorkspace", {
      path: { organizationId },
    });
  }

  inviteOrganizationMember(
    organizationId: string,
    input: CourseOrganizationInviteInput,
  ): Promise<CourseOrganizationWorkspace> {
    return apiOperation<
      CourseOrganizationWorkspace,
      "postEducationOrganizationsByOrganizationIdMembers"
    >("postEducationOrganizationsByOrganizationIdMembers", {
      path: { organizationId },
      body: input,
    });
  }

  addOrganizationLocation(
    organizationId: string,
    input: CourseOrganizationLocationInput,
  ): Promise<CourseOrganizationWorkspace> {
    return apiOperation<
      CourseOrganizationWorkspace,
      "postEducationOrganizationsByOrganizationIdLocations"
    >("postEducationOrganizationsByOrganizationIdLocations", {
      path: { organizationId },
      body: input,
    });
  }

  respondToLead(
    tutorProfileId: string,
    leadId: string,
    decision: "accept" | "decline" | "invalid",
    declineReason?: string,
  ): Promise<CourseLead> {
    return apiOperation<CourseLead, "patchEducationLeadsByLeadId">(
      "patchEducationLeadsByLeadId",
      {
        path: { leadId },
        body: { tutorProfileId, decision, declineReason },
      },
    );
  }

  async getSavedTutorIds(
    _accountId: string,
    marketCode: string,
  ): Promise<string[]> {
    const result = await apiOperation<
      { tutorProfileIds: string[] },
      "getEducationFavorites"
    >("getEducationFavorites", {
      headers: { "X-Shongre-Market": marketCode },
    });
    return result.tutorProfileIds;
  }

  async setSavedTutor(
    _accountId: string,
    tutorProfileId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean> {
    const result = await apiOperation<
      { isFavorite: boolean },
      "putEducationTutorsByIdFavorite"
    >("putEducationTutorsByIdFavorite", {
      path: { id: tutorProfileId },
      body: { isFavorite },
      headers: { "X-Shongre-Market": marketCode },
    });
    return result.isFavorite;
  }

  updateMarketConfig(
    marketCode: string,
    config: CourseMarketConfig,
  ): Promise<CourseMarketConfig> {
    return apiOperation<
      CourseMarketConfig,
      "putEducationAdminMarketsByMarketCode"
    >("putEducationAdminMarketsByMarketCode", {
      path: { marketCode },
      body: config,
    });
  }

  updatePlan(
    marketCode: string,
    planId: string,
    patch: Partial<
      Pick<
        CoursePlan,
        "isActive" | "monthlyPrice" | "annualPrice" | "entitlements"
      >
    >,
  ): Promise<CoursePlan> {
    return apiOperation<
      CoursePlan,
      "patchEducationAdminMarketsByMarketCodePlansByPlanId"
    >("patchEducationAdminMarketsByMarketCodePlansByPlanId", {
      path: { marketCode, planId },
      body: patch,
    });
  }
}

export const httpCoursesService = new HttpCoursesService();
