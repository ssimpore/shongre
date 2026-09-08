import type {
  CourseLead,
  CourseMarketConfig,
  CourseOffer,
  CoursePublicOffer,
  CourseOrganizationWorkspace,
  CoursePlan,
  CourseSubject,
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
  private readonly tutorDraftMarkets = new Map<string, string>();
  private readonly learnerDraftMarkets = new Map<string, string>();

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

  getTutorOnboardingDraft(
    accountId: string,
    marketCode: string,
    _displayName?: string,
  ): Promise<TutorOnboardingDraft> {
    this.tutorDraftMarkets.set(accountId, marketCode);
    return apiOperation<
      TutorOnboardingDraft,
      "getEducationWorkflowdraftsTutoronboarding"
    >("getEducationWorkflowdraftsTutoronboarding", {
      query: { market: marketCode },
    });
  }

  saveTutorOnboardingDraft(
    accountId: string,
    draft: TutorOnboardingDraft,
  ): Promise<void> {
    return apiOperation<void, "putEducationWorkflowdraftsTutoronboarding">(
      "putEducationWorkflowdraftsTutoronboarding",
      {
        body: {
          marketCode: this.tutorDraftMarkets.get(accountId) || "FR",
          draft,
        },
      },
    );
  }

  submitTutorOnboarding(
    accountId: string,
    marketCode: string,
    draft: TutorOnboardingDraft,
  ): Promise<{ profile: TutorProfile; offer: CourseOffer }> {
    this.tutorDraftMarkets.set(accountId, marketCode);
    return apiOperation<
      { profile: TutorProfile; offer: CourseOffer },
      "postEducationOnboardingSubmit"
    >("postEducationOnboardingSubmit", {
      body: { marketCode, draft },
    });
  }

  async clearTutorOnboardingDraft(accountId: string): Promise<void> {
    const market = this.tutorDraftMarkets.get(accountId) || "FR";
    await apiOperation<void, "deleteEducationWorkflowdraftsTutoronboarding">(
      "deleteEducationWorkflowdraftsTutoronboarding",
      {
        query: { market },
      },
    );
    this.tutorDraftMarkets.delete(accountId);
  }

  getLearnerRequestDraft(
    accountId: string,
    marketCode: string,
    subjectId?: string,
  ): Promise<LearnerRequestProgressDraft> {
    this.learnerDraftMarkets.set(accountId, marketCode);
    return apiOperation<
      LearnerRequestProgressDraft,
      "getEducationWorkflowdraftsLearnerrequest"
    >("getEducationWorkflowdraftsLearnerrequest", {
      query: { market: marketCode, subject: subjectId },
    });
  }

  saveLearnerRequestDraft(
    accountId: string,
    draft: LearnerRequestProgressDraft,
  ): Promise<void> {
    return apiOperation<void, "putEducationWorkflowdraftsLearnerrequest">(
      "putEducationWorkflowdraftsLearnerrequest",
      {
        body: {
          marketCode: this.learnerDraftMarkets.get(accountId) || "FR",
          draft,
        },
      },
    );
  }

  async clearLearnerRequestDraft(accountId: string): Promise<void> {
    const market = this.learnerDraftMarkets.get(accountId) || "FR";
    await apiOperation<void, "deleteEducationWorkflowdraftsLearnerrequest">(
      "deleteEducationWorkflowdraftsLearnerrequest",
      {
        query: { market },
      },
    );
    this.learnerDraftMarkets.delete(accountId);
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

  updateSubject(
    marketCode: string,
    subjectId: string,
    patch: Partial<Pick<CourseSubject, "label" | "isActive" | "levelIds">>,
  ): Promise<CourseSubject> {
    return apiOperation<
      CourseSubject,
      "patchEducationAdminMarketsByMarketCodeSubjectsBySubjectId"
    >("patchEducationAdminMarketsByMarketCodeSubjectsBySubjectId", {
      path: { marketCode, subjectId },
      body: patch,
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
