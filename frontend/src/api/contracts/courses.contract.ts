import type {
  CourseCatalog,
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
} from "@shongre/contracts/courses";

export type TutorProfileDraft = Omit<
  TutorProfile,
  "id" | "userId" | "schemaVersion" | "vertical" | "createdAt" | "updatedAt"
> & { id?: string };

export type CourseOfferDraft = Omit<
  CourseOffer,
  "id" | "schemaVersion" | "vertical" | "createdAt" | "updatedAt"
> & { id?: string };

export type LearnerRequestDraft = Omit<
  LearnerRequest,
  "id" | "requesterUserId" | "status" | "createdAt" | "expiresAt"
>;

export type CourseOrganizationInviteInput = {
  displayName: string;
  role: CourseOrganizationWorkspace["members"][number]["role"];
};

export type CourseOrganizationLocationInput = {
  label: string;
};

export interface CoursesServiceContract {
  getCatalog(marketCode: string): Promise<CourseCatalog>;
  getAdminCatalog(marketCode: string): Promise<CourseCatalog>;
  searchTutors(query: TutorSearchQuery): Promise<TutorSearchResponse>;
  getTutorProfile(
    idOrSlug: string,
  ): Promise<{ tutor: TutorPublicProfile; offers: CoursePublicOffer[] }>;
  saveTutorProfile(profile: TutorProfileDraft): Promise<TutorProfile>;
  createCourseOffer(offer: CourseOfferDraft): Promise<CourseOffer>;
  submitLearnerRequest(request: LearnerRequestDraft): Promise<LearnerRequest>;
  getTutorWorkspace(tutorProfileId: string): Promise<TutorWorkspace>;
  getOrganizationWorkspace(organizationId: string): Promise<CourseOrganizationWorkspace>;
  inviteOrganizationMember(
    organizationId: string,
    input: CourseOrganizationInviteInput,
  ): Promise<CourseOrganizationWorkspace>;
  addOrganizationLocation(
    organizationId: string,
    input: CourseOrganizationLocationInput,
  ): Promise<CourseOrganizationWorkspace>;
  respondToLead(
    tutorProfileId: string,
    leadId: string,
    decision: "accept" | "decline" | "invalid",
    declineReason?: string,
  ): Promise<CourseLead>;
  getSavedTutorIds(accountId: string): Promise<string[]>;
  toggleSavedTutor(accountId: string, tutorProfileId: string): Promise<boolean>;
  updateMarketConfig(
    marketCode: string,
    config: CourseMarketConfig,
  ): Promise<CourseMarketConfig>;
  updateSubject(
    marketCode: string,
    subjectId: string,
    patch: Partial<Pick<CourseSubject, "label" | "isActive" | "levelIds">>,
  ): Promise<CourseSubject>;
  updatePlan(
    marketCode: string,
    planId: string,
    patch: Partial<
      Pick<CoursePlan, "isActive" | "monthlyPrice" | "annualPrice" | "entitlements">
    >,
  ): Promise<CoursePlan>;
}
