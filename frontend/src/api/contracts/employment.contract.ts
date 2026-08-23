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

export interface EmploymentServiceContract {
  getCatalog(marketCode: string): Promise<EmploymentCatalog>;
  searchJobs(query: EmploymentSearchQuery): Promise<EmploymentSearchResult>;
  getJob(idOrSlug: string): Promise<JobPostingDetail>;
  getSimilarJobs(idOrSlug: string): Promise<JobPostingCard[]>;
  getDraft(draftId: string): Promise<JobDraft | null>;
  saveDraft(draft: JobDraft): Promise<JobDraft>;
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
