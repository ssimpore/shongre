import type {
  CandidateProfile,
  CandidateDataExport,
  CandidateWorkspace,
  EmploymentAdminOverview,
  EmploymentApplication,
  EmploymentCatalog,
  EmploymentImport,
  EmploymentInterview,
  EmploymentJobReport,
  EmploymentMarketConfig,
  EmploymentSearchQuery,
  EmploymentSearchResult,
  EmployerSummary,
  JobDraft,
  JobAlert,
  JobPostingCard,
  JobPostingDetail,
  ProhibitedLanguageFlag,
  EmploymentDataSubjectRequest,
  RecruiterNote,
  RecruiterWorkspace,
} from "@shongre/contracts/employment";
import type { VerticalCheckout } from "@shongre/contracts/vertical";

export interface EmploymentApplicationDraft {
  cvId: string;
  coverMessage?: string;
  screeningAnswers: Array<{ questionId: string; answer: unknown }>;
  privacyConsent: true;
  privacyPolicyVersion: string;
}

export interface EmploymentPublicationDraftData {
  [key: string]: unknown;
  employerId: string;
  employerName: string;
  employerDescription: string;
  positionsCount: string;
  internalReference: string;
  title: string;
  professionId: string;
  specializationId: string;
  industryId: string;
  responsibilities: string;
  requiredSkills: string;
  preferredSkills: string;
  contractTypeId: string;
  contractDuration: string;
  workingArrangementId: string;
  workingTimeId: string;
  weeklyHours: string;
  requiredExperienceId: string;
  educationLevelId: string;
  qualificationSummary: string;
  certifications: string;
  city: string;
  postalCode: string;
  additionalLocations: string;
  travelRequirement: string;
  accessibilityInformation: string;
  salaryMinimum: string;
  salaryMaximum: string;
  salaryFrequencyId: string;
  benefits: string;
  bonusDescription: string;
  trialPeriodInformation: string;
  desiredStartDate: string;
  applicationDeadline: string;
  recruitmentProcess: string;
  publishSalary: boolean;
  applicationMethod: "shongre" | "external" | "contact_recruiter";
  externalApplicationUrl: string;
  screeningQuestion: string;
  privacyNoticeAccepted: boolean;
  checkoutId: string;
}

export const EMPTY_EMPLOYMENT_PUBLICATION_DRAFT: EmploymentPublicationDraftData =
  {
    employerId: "",
    employerName: "",
    employerDescription: "",
    positionsCount: "",
    internalReference: "",
    title: "",
    professionId: "",
    specializationId: "",
    industryId: "",
    responsibilities: "",
    requiredSkills: "",
    preferredSkills: "",
    contractTypeId: "",
    contractDuration: "",
    workingArrangementId: "",
    workingTimeId: "",
    weeklyHours: "",
    requiredExperienceId: "",
    educationLevelId: "",
    qualificationSummary: "",
    certifications: "",
    city: "",
    postalCode: "",
    additionalLocations: "",
    travelRequirement: "",
    accessibilityInformation: "",
    salaryMinimum: "",
    salaryMaximum: "",
    salaryFrequencyId: "",
    benefits: "",
    bonusDescription: "",
    trialPeriodInformation: "",
    desiredStartDate: "",
    applicationDeadline: "",
    recruitmentProcess: "",
    publishSalary: false,
    applicationMethod: "shongre",
    externalApplicationUrl: "",
    screeningQuestion: "",
    privacyNoticeAccepted: false,
    checkoutId: "",
  };

export interface SaveEmploymentPublicationDraftInput {
  draftId: string;
  ownerUserId: string;
  marketCode: string;
  countryCode: string;
  currentStep: number;
  privateEmployer: boolean;
  data: EmploymentPublicationDraftData;
  selectedOfferId: string;
  selectedAddOnIds: string[];
  duplicateCandidateIds: string[];
  markAllPreviousStepsComplete?: boolean;
}

export interface EmploymentServiceContract {
  getCatalog(marketCode: string): Promise<EmploymentCatalog>;
  searchJobs(query: EmploymentSearchQuery): Promise<EmploymentSearchResult>;
  getJob(idOrSlug: string): Promise<JobPostingDetail>;
  getSimilarJobs(idOrSlug: string): Promise<JobPostingCard[]>;
  getOrCreateDraft(
    ownerUserId: string,
    marketCode: string,
    preferredDraftId?: string,
  ): Promise<JobDraft>;
  getDraft(draftId: string): Promise<JobDraft | null>;
  saveDraft(draft: JobDraft): Promise<JobDraft>;
  savePublicationDraft(
    input: SaveEmploymentPublicationDraftInput,
  ): Promise<JobDraft>;
  checkDuplicateDraft(
    draftId: string,
  ): Promise<{ duplicateCandidateIds: string[] }>;
  submitDraft(draftId: string): Promise<{
    jobId: string;
    lifecycle: "pending_review" | "published";
    complianceFlags: ProhibitedLanguageFlag[];
  }>;
  flagProhibitedLanguage(content: string): Promise<ProhibitedLanguageFlag[]>;
  getCandidateWorkspace(): Promise<CandidateWorkspace>;
  saveCandidateProfile(profile: CandidateProfile): Promise<CandidateProfile>;
  apply(
    jobId: string,
    input: EmploymentApplicationDraft,
  ): Promise<EmploymentApplication>;
  withdrawApplication(applicationId: string): Promise<EmploymentApplication>;
  toggleSavedJob(jobId: string): Promise<{ saved: boolean }>;
  reportJob(
    jobId: string,
    input: Pick<EmploymentJobReport, "reason" | "details">,
  ): Promise<EmploymentJobReport>;
  saveJobAlert(input: {
    label: string;
    query: EmploymentSearchQuery;
    frequency: JobAlert["frequency"];
  }): Promise<JobAlert>;
  deleteJobAlert(alertId: string): Promise<void>;
  exportCandidateData(): Promise<CandidateDataExport>;
  requestCandidateDeletion(): Promise<EmploymentDataSubjectRequest>;
  respondToInterview(
    interviewId: string,
    status: "confirmed" | "cancelled",
  ): Promise<EmploymentInterview>;
  listRecruiterEmployers(): Promise<EmployerSummary[]>;
  getRecruiterWorkspace(employerId: string): Promise<RecruiterWorkspace>;
  duplicateJob(employerId: string, jobId: string): Promise<JobDraft>;
  moveApplication(
    employerId: string,
    applicationId: string,
    input: { stageId: string; reason?: string; notifyCandidate?: boolean },
  ): Promise<EmploymentApplication>;
  addRecruiterNote(
    employerId: string,
    applicationId: string,
    body: string,
  ): Promise<RecruiterNote>;
  scheduleInterview(
    employerId: string,
    applicationId: string,
    interview: Omit<
      EmploymentInterview,
      "id" | "applicationId" | "createdAt" | "updatedAt"
    >,
  ): Promise<EmploymentInterview>;
  previewImport(
    employerId: string,
    input: {
      sourceType: EmploymentImport["sourceType"];
      sourceIdentifier: string;
      idempotencyKey: string;
    },
  ): Promise<EmploymentImport>;
  requestImport(
    employerId: string,
    input: {
      sourceType: EmploymentImport["sourceType"];
      sourceIdentifier: string;
      idempotencyKey: string;
    },
  ): Promise<EmploymentImport>;
  createCheckout(input: {
    marketCode: string;
    offerId?: string;
    addOnIds?: string[];
    idempotencyKey: string;
    scenario?: "success" | "pending" | "failed" | "requires_action";
  }): Promise<VerticalCheckout>;
  getAdminOverview(marketCode: string): Promise<EmploymentAdminOverview>;
  updateMarketConfig(
    marketCode: string,
    patch: Partial<EmploymentMarketConfig>,
  ): Promise<EmploymentMarketConfig>;
  updateOffer(
    offerId: string,
    patch: Partial<EmploymentCatalog["offers"][number]>,
  ): Promise<EmploymentCatalog["offers"][number]>;
}
