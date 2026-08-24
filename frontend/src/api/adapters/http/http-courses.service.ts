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
  TutorProfileDraft,
} from "../../contracts/courses.contract";
import { httpClient } from "./http-client";

const EDUCATION_API_BASE = "/education";

export class HttpCoursesService implements CoursesServiceContract {
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

  // Saved tutors currently reuse account-scoped frontend storage. The API
  // endpoint is reserved until the generic favorites table gains a typed
  // vertical target. API mode therefore exposes an empty server state rather
  // than leaking another account's local bucket.
  async getSavedTutorIds(_accountId: string): Promise<string[]> {
    return [];
  }

  async toggleSavedTutor(
    _accountId: string,
    _tutorProfileId: string,
  ): Promise<boolean> {
    throw new Error(
      "La sauvegarde des professeurs sera disponible après migration des favoris verticaux.",
    );
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
