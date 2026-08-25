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
  DeliveryMode,
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
  email: string;
  role: CourseOrganizationWorkspace["members"][number]["role"];
};

export type CourseOrganizationLocationInput = {
  label: string;
};

export interface TutorOnboardingDraft {
  accountKind: "individual" | "organization";
  organizationId?: string;
  displayName: string;
  organizationName: string;
  headline: string;
  subjectIds: string[];
  levelIds: string[];
  deliveryModes: DeliveryMode[];
  city: string;
  radiusKm: number;
  languages: string[];
  experienceYears: number;
  biography: string;
  teachingApproach: string;
  priceMinor: number;
  availability: string[];
  planId: string;
}

/** Non-sensitive learner criteria that may survive navigation and refresh. */
export interface LearnerRequestProgressDraft {
  subjectId: string;
  levelId: string;
  objective: string;
  preferredSchedule: string[];
  deliveryModes: DeliveryMode[];
  city: string;
  radiusKm: number;
  budgetMinEuros: string;
  budgetMaxEuros: string;
  desiredStartDate: string;
  context: string;
  learnerAgeBand: LearnerRequestDraft["learnerAgeBand"];
}

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
  getTutorOnboardingDraft(
    accountId: string,
    marketCode: string,
    displayName?: string,
  ): Promise<TutorOnboardingDraft>;
  saveTutorOnboardingDraft(
    accountId: string,
    draft: TutorOnboardingDraft,
  ): Promise<void>;
  submitTutorOnboarding(
    accountId: string,
    marketCode: string,
    draft: TutorOnboardingDraft,
  ): Promise<{ profile: TutorProfile; offer: CourseOffer }>;
  clearTutorOnboardingDraft(accountId: string): Promise<void>;
  getLearnerRequestDraft(
    accountId: string,
    marketCode: string,
    subjectId?: string,
  ): Promise<LearnerRequestProgressDraft>;
  saveLearnerRequestDraft(
    accountId: string,
    draft: LearnerRequestProgressDraft,
  ): Promise<void>;
  clearLearnerRequestDraft(accountId: string): Promise<void>;
  getTutorWorkspace(tutorProfileId: string): Promise<TutorWorkspace>;
  getOrganizationWorkspace(
    organizationId: string,
  ): Promise<CourseOrganizationWorkspace>;
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
      Pick<
        CoursePlan,
        "isActive" | "monthlyPrice" | "annualPrice" | "entitlements"
      >
    >,
  ): Promise<CoursePlan>;
}
