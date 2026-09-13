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
import { apiOperation } from "./generated-api-operation";
import type { VerticalCheckout } from "@shongre/contracts/vertical";
import type {
  EmploymentApplicationDraft,
  EmploymentServiceContract,
  SaveEmploymentPublicationDraftInput,
} from "../../contracts/employment.contract";

export class HttpEmploymentService implements EmploymentServiceContract {
  getCatalog(marketCode: string) {
    return apiOperation<EmploymentCatalog, "getEmploymentCatalog">(
      "getEmploymentCatalog",
      { query: { market: marketCode } },
    );
  }
  searchJobs(query: EmploymentSearchQuery) {
    return apiOperation<EmploymentSearchResult, "postEmploymentSearch">(
      "postEmploymentSearch",
      { body: query },
    );
  }
  getJob(idOrSlug: string, marketCode?: string) {
    return apiOperation<JobPostingDetail, "getEmploymentJobsById">(
      "getEmploymentJobsById",
      {
        path: { id: idOrSlug },
        ...(marketCode ? { headers: { "X-Shongre-Market": marketCode } } : {}),
      },
    );
  }
  getSimilarJobs(idOrSlug: string, marketCode?: string) {
    return apiOperation<JobPostingCard[], "getEmploymentJobsByIdSimilar">(
      "getEmploymentJobsByIdSimilar",
      {
        path: { id: idOrSlug },
        ...(marketCode ? { headers: { "X-Shongre-Market": marketCode } } : {}),
      },
    );
  }
  getOrCreateDraft(
    marketCode: string,
    preferredDraftId?: string,
  ): Promise<JobDraft> {
    return apiOperation<JobDraft, "postEmploymentDrafts">(
      "postEmploymentDrafts",
      {
        body: {
          marketCode,
          preferredDraftId,
        },
      },
    );
  }
  async getDraft(draftId: string) {
    try {
      return await apiOperation<JobDraft, "getEmploymentDraftsById">(
        "getEmploymentDraftsById",
        { path: { id: draftId } },
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
    return apiOperation<JobDraft, "putEmploymentDraftsById">(
      "putEmploymentDraftsById",
      { path: { id: draft.id }, body: draft },
    );
  }
  savePublicationDraft(
    input: SaveEmploymentPublicationDraftInput,
  ): Promise<JobDraft> {
    return apiOperation<JobDraft, "putEmploymentDraftsByIdPublication">(
      "putEmploymentDraftsByIdPublication",
      {
        path: { id: input.draftId },
        body: {
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
      },
    );
  }
  checkDuplicateDraft(draftId: string) {
    return apiOperation<
      { duplicateCandidateIds: string[] },
      "postEmploymentDraftsByIdDuplicateCheck"
    >("postEmploymentDraftsByIdDuplicateCheck", { path: { id: draftId } });
  }
  submitDraft(draftId: string) {
    return apiOperation<
      {
        jobId: string;
        lifecycle: "pending_review" | "published";
        complianceFlags: ProhibitedLanguageFlag[];
      },
      "postEmploymentDraftsByIdSubmit"
    >("postEmploymentDraftsByIdSubmit", { path: { id: draftId } });
  }
  async flagProhibitedLanguage(content: string) {
    const result = await apiOperation<
      { flags: ProhibitedLanguageFlag[] },
      "postEmploymentComplianceProhibitedLanguage"
    >("postEmploymentComplianceProhibitedLanguage", { body: { content } });
    return result.flags;
  }
  getCandidateWorkspace(marketCode: string) {
    return apiOperation<CandidateWorkspace, "getEmploymentCandidateWorkspace">(
      "getEmploymentCandidateWorkspace",
      { headers: { "X-Shongre-Market": marketCode } },
    );
  }
  saveCandidateProfile(profile: CandidateProfile) {
    return apiOperation<CandidateProfile, "putEmploymentCandidateProfile">(
      "putEmploymentCandidateProfile",
      { body: profile },
    );
  }
  apply(jobId: string, input: EmploymentApplicationDraft) {
    return apiOperation<
      EmploymentApplication,
      "postEmploymentJobsByIdApplications"
    >("postEmploymentJobsByIdApplications", {
      path: { id: jobId },
      body: input,
    });
  }
  withdrawApplication(applicationId: string) {
    return apiOperation<
      EmploymentApplication,
      "postEmploymentApplicationsByIdWithdraw"
    >("postEmploymentApplicationsByIdWithdraw", {
      path: { id: applicationId },
    });
  }
  async getSavedJobIds(marketCode: string): Promise<string[]> {
    const result = await apiOperation<
      { jobIds: string[] },
      "getEmploymentFavorites"
    >("getEmploymentFavorites", {
      headers: { "X-Shongre-Market": marketCode },
    });
    return result.jobIds;
  }
  async setSavedJob(
    jobId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean> {
    const result = await apiOperation<
      { isFavorite: boolean },
      "putEmploymentJobsByIdSave"
    >("putEmploymentJobsByIdSave", {
      path: { id: jobId },
      body: { isFavorite },
      headers: { "X-Shongre-Market": marketCode },
    });
    return result.isFavorite;
  }
  reportJob(
    jobId: string,
    input: Pick<EmploymentJobReport, "reason" | "details">,
  ) {
    return apiOperation<EmploymentJobReport, "postEmploymentJobsByIdReport">(
      "postEmploymentJobsByIdReport",
      { path: { id: jobId }, body: input },
    );
  }
  saveJobAlert(input: {
    label: string;
    query: EmploymentSearchQuery;
    frequency: JobAlert["frequency"];
  }) {
    return apiOperation<JobAlert, "postEmploymentCandidateAlerts">(
      "postEmploymentCandidateAlerts",
      { body: input },
    );
  }
  deleteJobAlert(alertId: string) {
    return apiOperation<void, "deleteEmploymentCandidateAlertsById">(
      "deleteEmploymentCandidateAlertsById",
      { path: { id: alertId } },
    );
  }
  exportCandidateData() {
    return apiOperation<
      CandidateDataExport,
      "postEmploymentCandidateDataExport"
    >("postEmploymentCandidateDataExport", {});
  }
  requestCandidateDeletion() {
    return apiOperation<
      EmploymentDataSubjectRequest,
      "postEmploymentCandidateDeletionRequest"
    >("postEmploymentCandidateDeletionRequest", {});
  }
  respondToInterview(interviewId: string, status: "confirmed" | "cancelled") {
    return apiOperation<
      EmploymentInterview,
      "patchEmploymentCandidateInterviewsById"
    >("patchEmploymentCandidateInterviewsById", {
      path: { id: interviewId },
      body: { status },
    });
  }
  listRecruiterEmployers() {
    return apiOperation<EmployerSummary[], "getEmploymentRecruiterEmployers">(
      "getEmploymentRecruiterEmployers",
      {},
    );
  }
  getRecruiterWorkspace(employerId: string) {
    return apiOperation<
      RecruiterWorkspace,
      "getEmploymentEmployersByEmployerIdWorkspace"
    >("getEmploymentEmployersByEmployerIdWorkspace", {
      path: { employerId: employerId },
    });
  }
  duplicateJob(employerId: string, jobId: string) {
    return apiOperation<
      JobDraft,
      "postEmploymentEmployersByEmployerIdJobsByJobIdDuplicate"
    >("postEmploymentEmployersByEmployerIdJobsByJobIdDuplicate", {
      path: { employerId: employerId, jobId: jobId },
    });
  }
  moveApplication(
    employerId: string,
    applicationId: string,
    input: { stageId: string; reason?: string; notifyCandidate?: boolean },
  ) {
    return apiOperation<
      EmploymentApplication,
      "patchEmploymentEmployersByEmployerIdApplicationsByApplicationIdStage"
    >("patchEmploymentEmployersByEmployerIdApplicationsByApplicationIdStage", {
      path: { employerId: employerId, applicationId: applicationId },
      body: input,
    });
  }
  addRecruiterNote(employerId: string, applicationId: string, body: string) {
    return apiOperation<
      RecruiterNote,
      "postEmploymentEmployersByEmployerIdApplicationsByApplicationIdNotes"
    >("postEmploymentEmployersByEmployerIdApplicationsByApplicationIdNotes", {
      path: { employerId: employerId, applicationId: applicationId },
      body: { body },
    });
  }
  scheduleInterview(
    employerId: string,
    applicationId: string,
    interview: Omit<
      EmploymentInterview,
      "id" | "applicationId" | "createdAt" | "updatedAt"
    >,
  ) {
    return apiOperation<
      EmploymentInterview,
      "postEmploymentEmployersByEmployerIdApplicationsByApplicationIdInterviews"
    >(
      "postEmploymentEmployersByEmployerIdApplicationsByApplicationIdInterviews",
      {
        path: { employerId: employerId, applicationId: applicationId },
        body: interview,
      },
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
    return apiOperation<
      EmploymentImport,
      "postEmploymentEmployersByEmployerIdImportsPreview"
    >("postEmploymentEmployersByEmployerIdImportsPreview", {
      path: { employerId: employerId },
      body: input,
    });
  }
  requestImport(
    employerId: string,
    input: {
      sourceType: EmploymentImport["sourceType"];
      sourceIdentifier: string;
      idempotencyKey: string;
    },
  ) {
    return apiOperation<
      EmploymentImport,
      "postEmploymentEmployersByEmployerIdImports"
    >("postEmploymentEmployersByEmployerIdImports", {
      path: { employerId: employerId },
      body: input,
    });
  }
  createCheckout(input: {
    marketCode: string;
    offerId?: string;
    addOnIds?: string[];
    idempotencyKey: string;
  }) {
    return apiOperation<VerticalCheckout, "postEmploymentCheckouts">(
      "postEmploymentCheckouts",
      { body: input },
    );
  }
  getAdminOverview(marketCode: string) {
    return apiOperation<EmploymentAdminOverview, "getEmploymentAdminOverview">(
      "getEmploymentAdminOverview",
      { query: { market: marketCode } },
    );
  }
  updateMarketConfig(
    marketCode: string,
    patch: Partial<EmploymentMarketConfig>,
  ) {
    return apiOperation<
      EmploymentMarketConfig,
      "putEmploymentAdminMarketsByMarketCode"
    >("putEmploymentAdminMarketsByMarketCode", {
      path: { marketCode: marketCode },
      body: patch,
    });
  }
  updateOffer(
    offerId: string,
    patch: Partial<EmploymentCatalog["offers"][number]>,
  ) {
    return apiOperation<
      EmploymentCatalog["offers"][number],
      "patchEmploymentAdminOffersByOfferId"
    >("patchEmploymentAdminOffersByOfferId", {
      path: { offerId: offerId },
      body: patch,
    });
  }
}

export const httpEmploymentService = new HttpEmploymentService();
