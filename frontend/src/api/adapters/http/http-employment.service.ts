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
import type {
  EmploymentApplicationDraft,
  EmploymentServiceContract,
  SaveEmploymentPublicationDraftInput,
} from "../../contracts/employment.contract";
import { httpClient } from "./http-client";

export class HttpEmploymentService implements EmploymentServiceContract {
  getCatalog(marketCode: string) {
    return httpClient.get<EmploymentCatalog>("/employment/catalog", {
      params: { market: marketCode },
    });
  }
  searchJobs(query: EmploymentSearchQuery) {
    return httpClient.post<EmploymentSearchResult>("/employment/search", query);
  }
  getJob(idOrSlug: string) {
    return httpClient.get<JobPostingDetail>(
      `/employment/jobs/${encodeURIComponent(idOrSlug)}`,
    );
  }
  getSimilarJobs(idOrSlug: string) {
    return httpClient.get<JobPostingCard[]>(
      `/employment/jobs/${encodeURIComponent(idOrSlug)}/similar`,
    );
  }
  getOrCreateDraft(
    _ownerUserId: string,
    marketCode: string,
    preferredDraftId?: string,
  ): Promise<JobDraft> {
    return httpClient.post<JobDraft>("/employment/drafts", {
      marketCode,
      preferredDraftId,
    });
  }
  async getDraft(draftId: string) {
    try {
      return await httpClient.get<JobDraft>(
        `/employment/drafts/${encodeURIComponent(draftId)}`,
      );
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "NOT_FOUND"
      )
        return null;
      throw error;
    }
  }
  saveDraft(draft: JobDraft) {
    return httpClient.put<JobDraft>(
      `/employment/drafts/${encodeURIComponent(draft.id)}`,
      draft,
    );
  }
  savePublicationDraft(
    input: SaveEmploymentPublicationDraftInput,
  ): Promise<JobDraft> {
    return httpClient.put<JobDraft>(
      `/employment/drafts/${encodeURIComponent(input.draftId)}/publication`,
      {
        marketCode: input.marketCode,
        countryCode: input.countryCode,
        currentStep: input.currentStep,
        privateEmployer: input.privateEmployer,
        data: input.data,
        selectedOfferId: input.selectedOfferId,
        selectedAddOnIds: input.selectedAddOnIds,
        duplicateCandidateIds: input.duplicateCandidateIds,
        markAllPreviousStepsComplete: input.markAllPreviousStepsComplete,
      },
    );
  }
  checkDuplicateDraft(draftId: string) {
    return httpClient.post<{ duplicateCandidateIds: string[] }>(
      `/employment/drafts/${encodeURIComponent(draftId)}/duplicate-check`,
    );
  }
  submitDraft(draftId: string) {
    return httpClient.post<{
      jobId: string;
      lifecycle: "pending_review" | "published";
      complianceFlags: ProhibitedLanguageFlag[];
    }>(`/employment/drafts/${encodeURIComponent(draftId)}/submit`);
  }
  async flagProhibitedLanguage(content: string) {
    const result = await httpClient.post<{ flags: ProhibitedLanguageFlag[] }>(
      "/employment/compliance/prohibited-language",
      { content },
    );
    return result.flags;
  }
  getCandidateWorkspace() {
    return httpClient.get<CandidateWorkspace>(
      "/employment/candidate/workspace",
    );
  }
  saveCandidateProfile(profile: CandidateProfile) {
    return httpClient.put<CandidateProfile>(
      "/employment/candidate/profile",
      profile,
    );
  }
  apply(jobId: string, input: EmploymentApplicationDraft) {
    return httpClient.post<EmploymentApplication>(
      `/employment/jobs/${encodeURIComponent(jobId)}/applications`,
      input,
    );
  }
  withdrawApplication(applicationId: string) {
    return httpClient.post<EmploymentApplication>(
      `/employment/applications/${encodeURIComponent(applicationId)}/withdraw`,
    );
  }
  toggleSavedJob(jobId: string) {
    return httpClient.post<{ saved: boolean }>(
      `/employment/jobs/${encodeURIComponent(jobId)}/save`,
    );
  }
  reportJob(
    jobId: string,
    input: Pick<EmploymentJobReport, "reason" | "details">,
  ) {
    return httpClient.post<EmploymentJobReport>(
      `/employment/jobs/${encodeURIComponent(jobId)}/report`,
      input,
    );
  }
  saveJobAlert(input: {
    label: string;
    query: EmploymentSearchQuery;
    frequency: JobAlert["frequency"];
  }) {
    return httpClient.post<JobAlert>("/employment/candidate/alerts", input);
  }
  deleteJobAlert(alertId: string) {
    return httpClient.request<void>(
      `/employment/candidate/alerts/${encodeURIComponent(alertId)}`,
      { method: "DELETE" },
    );
  }
  exportCandidateData() {
    return httpClient.post<CandidateDataExport>(
      "/employment/candidate/data-export",
    );
  }
  requestCandidateDeletion() {
    return httpClient.post<EmploymentDataSubjectRequest>(
      "/employment/candidate/deletion-request",
    );
  }
  respondToInterview(interviewId: string, status: "confirmed" | "cancelled") {
    return httpClient.request<EmploymentInterview>(
      `/employment/candidate/interviews/${encodeURIComponent(interviewId)}`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    );
  }
  listRecruiterEmployers() {
    return httpClient.get<EmployerSummary[]>("/employment/recruiter/employers");
  }
  getRecruiterWorkspace(employerId: string) {
    return httpClient.get<RecruiterWorkspace>(
      `/employment/employers/${encodeURIComponent(employerId)}/workspace`,
    );
  }
  duplicateJob(employerId: string, jobId: string) {
    return httpClient.post<JobDraft>(
      `/employment/employers/${encodeURIComponent(employerId)}/jobs/${encodeURIComponent(jobId)}/duplicate`,
    );
  }
  moveApplication(
    employerId: string,
    applicationId: string,
    input: { stageId: string; reason?: string; notifyCandidate?: boolean },
  ) {
    return httpClient.request<EmploymentApplication>(
      `/employment/employers/${encodeURIComponent(employerId)}/applications/${encodeURIComponent(applicationId)}/stage`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
  }
  addRecruiterNote(employerId: string, applicationId: string, body: string) {
    return httpClient.post<RecruiterNote>(
      `/employment/employers/${encodeURIComponent(employerId)}/applications/${encodeURIComponent(applicationId)}/notes`,
      { body },
    );
  }
  scheduleInterview(
    employerId: string,
    applicationId: string,
    interview: Omit<
      EmploymentInterview,
      "id" | "applicationId" | "createdAt" | "updatedAt"
    >,
  ) {
    return httpClient.post<EmploymentInterview>(
      `/employment/employers/${encodeURIComponent(employerId)}/applications/${encodeURIComponent(applicationId)}/interviews`,
      interview,
    );
  }
  previewImport(
    employerId: string,
    input: {
      sourceType: EmploymentImport["sourceType"];
      sourceIdentifier: string;
      idempotencyKey: string;
    },
  ) {
    return httpClient.post<EmploymentImport>(
      `/employment/employers/${encodeURIComponent(employerId)}/imports/preview`,
      input,
    );
  }
  requestImport(
    employerId: string,
    input: {
      sourceType: EmploymentImport["sourceType"];
      sourceIdentifier: string;
      idempotencyKey: string;
    },
  ) {
    return httpClient.post<EmploymentImport>(
      `/employment/employers/${encodeURIComponent(employerId)}/imports`,
      input,
    );
  }
  createCheckout(input: {
    marketCode: string;
    offerId?: string;
    addOnIds?: string[];
    idempotencyKey: string;
  }) {
    return httpClient.post<VerticalCheckout>("/employment/checkouts", input);
  }
  getAdminOverview(marketCode: string) {
    return httpClient.get<EmploymentAdminOverview>(
      "/employment/admin/overview",
      {
        params: { market: marketCode },
      },
    );
  }
  updateMarketConfig(
    marketCode: string,
    patch: Partial<EmploymentMarketConfig>,
  ) {
    return httpClient.put<EmploymentMarketConfig>(
      `/employment/admin/markets/${encodeURIComponent(marketCode)}`,
      patch,
    );
  }
  updateOffer(
    offerId: string,
    patch: Partial<EmploymentCatalog["offers"][number]>,
  ) {
    return httpClient.request<EmploymentCatalog["offers"][number]>(
      `/employment/admin/offers/${encodeURIComponent(offerId)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
  }
}

export const httpEmploymentService = new HttpEmploymentService();
