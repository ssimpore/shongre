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
import { httpClient } from "./http-client";

const EDUCATION_API_BASE = "/education";

export class HttpCoursesService implements CoursesServiceContract {
  private readonly tutorDraftMarkets = new Map<string, string>();
  private readonly learnerDraftMarkets = new Map<string, string>();

  getCatalog(marketCode: string): Promise<CourseCatalog> {
    return httpClient.get(`${EDUCATION_API_BASE}/catalog`, {
      params: { market: marketCode },
    });
  }

  getAdminCatalog(marketCode: string): Promise<CourseCatalog> {
    return httpClient.get(`${EDUCATION_API_BASE}/admin/catalog`, {
      params: { market: marketCode },
    });
  }

  searchTutors(query: TutorSearchQuery): Promise<TutorSearchResponse> {
    return httpClient.post(`${EDUCATION_API_BASE}/search`, query);
  }

  getTutorProfile(idOrSlug: string) {
    return httpClient.get<{
      tutor: TutorPublicProfile;
      offers: CoursePublicOffer[];
    }>(`${EDUCATION_API_BASE}/tutors/${encodeURIComponent(idOrSlug)}`);
  }

  saveTutorProfile(profile: TutorProfileDraft): Promise<TutorProfile> {
    const id = profile.id || "new";
    return httpClient.put(
      `${EDUCATION_API_BASE}/tutors/${encodeURIComponent(id)}`,
      profile,
    );
  }

  createCourseOffer(offer: CourseOfferDraft): Promise<CourseOffer> {
    return httpClient.post(`${EDUCATION_API_BASE}/offers`, offer);
  }

  submitLearnerRequest(request: LearnerRequestDraft): Promise<LearnerRequest> {
    return httpClient.post(`${EDUCATION_API_BASE}/learner-requests`, request);
  }

  getTutorOnboardingDraft(
    accountId: string,
    marketCode: string,
    _displayName?: string,
  ): Promise<TutorOnboardingDraft> {
    this.tutorDraftMarkets.set(accountId, marketCode);
    return httpClient.get(
      `${EDUCATION_API_BASE}/workflow-drafts/tutor-onboarding`,
      { params: { market: marketCode } },
    );
  }

  saveTutorOnboardingDraft(
    accountId: string,
    draft: TutorOnboardingDraft,
  ): Promise<void> {
    return httpClient.put(
      `${EDUCATION_API_BASE}/workflow-drafts/tutor-onboarding`,
      {
        marketCode: this.tutorDraftMarkets.get(accountId) || "FR",
        draft,
      },
    );
  }

  submitTutorOnboarding(
    accountId: string,
    marketCode: string,
    draft: TutorOnboardingDraft,
  ): Promise<{ profile: TutorProfile; offer: CourseOffer }> {
    this.tutorDraftMarkets.set(accountId, marketCode);
    return httpClient.post(`${EDUCATION_API_BASE}/onboarding/submit`, {
      marketCode,
      draft,
    });
  }

  async clearTutorOnboardingDraft(accountId: string): Promise<void> {
    const market = this.tutorDraftMarkets.get(accountId) || "FR";
    await httpClient.delete(
      `${EDUCATION_API_BASE}/workflow-drafts/tutor-onboarding`,
      { params: { market } },
    );
    this.tutorDraftMarkets.delete(accountId);
  }

  getLearnerRequestDraft(
    accountId: string,
    marketCode: string,
    subjectId?: string,
  ): Promise<LearnerRequestProgressDraft> {
    this.learnerDraftMarkets.set(accountId, marketCode);
    return httpClient.get(
      `${EDUCATION_API_BASE}/workflow-drafts/learner-request`,
      { params: { market: marketCode, subject: subjectId } },
    );
  }

  saveLearnerRequestDraft(
    accountId: string,
    draft: LearnerRequestProgressDraft,
  ): Promise<void> {
    return httpClient.put(
      `${EDUCATION_API_BASE}/workflow-drafts/learner-request`,
      {
        marketCode: this.learnerDraftMarkets.get(accountId) || "FR",
        draft,
      },
    );
  }

  async clearLearnerRequestDraft(accountId: string): Promise<void> {
    const market = this.learnerDraftMarkets.get(accountId) || "FR";
    await httpClient.delete(
      `${EDUCATION_API_BASE}/workflow-drafts/learner-request`,
      { params: { market } },
    );
    this.learnerDraftMarkets.delete(accountId);
  }

  getTutorWorkspace(tutorProfileId: string): Promise<TutorWorkspace> {
    return httpClient.get(
      `${EDUCATION_API_BASE}/workspace/${encodeURIComponent(tutorProfileId)}`,
    );
  }

  getOrganizationWorkspace(
    organizationId: string,
  ): Promise<CourseOrganizationWorkspace> {
    return httpClient.get(
      `${EDUCATION_API_BASE}/organizations/${encodeURIComponent(organizationId)}/workspace`,
    );
  }

  inviteOrganizationMember(
    organizationId: string,
    input: CourseOrganizationInviteInput,
  ): Promise<CourseOrganizationWorkspace> {
    return httpClient.post(
      `${EDUCATION_API_BASE}/organizations/${encodeURIComponent(organizationId)}/members`,
      input,
    );
  }

  addOrganizationLocation(
    organizationId: string,
    input: CourseOrganizationLocationInput,
  ): Promise<CourseOrganizationWorkspace> {
    return httpClient.post(
      `${EDUCATION_API_BASE}/organizations/${encodeURIComponent(organizationId)}/locations`,
      input,
    );
  }

  respondToLead(
    tutorProfileId: string,
    leadId: string,
    decision: "accept" | "decline" | "invalid",
    declineReason?: string,
  ): Promise<CourseLead> {
    return httpClient.request(
      `${EDUCATION_API_BASE}/leads/${encodeURIComponent(leadId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ tutorProfileId, decision, declineReason }),
      },
    );
  }

  async getSavedTutorIds(_accountId: string): Promise<string[]> {
    const result = await httpClient.get<{ tutorProfileIds: string[] }>(
      `${EDUCATION_API_BASE}/favorites`,
    );
    return result.tutorProfileIds;
  }

  async toggleSavedTutor(
    _accountId: string,
    tutorProfileId: string,
  ): Promise<boolean> {
    const result = await httpClient.post<{ isFavorite: boolean }>(
      `${EDUCATION_API_BASE}/tutors/${encodeURIComponent(tutorProfileId)}/favorite`,
    );
    return result.isFavorite;
  }

  updateMarketConfig(
    marketCode: string,
    config: CourseMarketConfig,
  ): Promise<CourseMarketConfig> {
    return httpClient.put(
      `${EDUCATION_API_BASE}/admin/markets/${encodeURIComponent(marketCode)}`,
      config,
    );
  }

  updateSubject(
    marketCode: string,
    subjectId: string,
    patch: Partial<Pick<CourseSubject, "label" | "isActive" | "levelIds">>,
  ): Promise<CourseSubject> {
    return httpClient.request(
      `${EDUCATION_API_BASE}/admin/markets/${encodeURIComponent(marketCode)}/subjects/${encodeURIComponent(subjectId)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
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
    return httpClient.request(
      `${EDUCATION_API_BASE}/admin/markets/${encodeURIComponent(marketCode)}/plans/${encodeURIComponent(planId)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
  }
}

export const httpCoursesService = new HttpCoursesService();
