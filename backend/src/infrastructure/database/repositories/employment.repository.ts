import type {
  ApplicationEvent,
  ApplicationStage,
  CandidateProfile,
  CandidateWorkspace,
  ConsentRecord,
  EmploymentAdminOverview,
  EmploymentApplication,
  EmploymentCatalog,
  EmploymentDataSubjectRequest,
  EmploymentImport,
  EmploymentInterview,
  EmploymentJobReport,
  EmployerSummary,
  EmploymentMarketConfig,
  EmploymentSearchQuery,
  EmploymentSearchResult,
  JobDraft,
  JobAlert,
  JobPostingDetail,
  ProhibitedLanguageFlag,
  RecruiterNote,
  RecruiterWorkspace,
} from "@shongre/contracts/employment";
import {
  applicationEventSchema,
  applicationSchema,
  candidateProfileSchema,
  consentRecordSchema,
  employmentCatalogSchema,
  employmentDataSubjectRequestSchema,
  employmentImportSchema,
  employmentJobReportSchema,
  interviewSchema,
  employmentSearchQuerySchema,
  jobDraftSchema,
  jobAlertSchema,
  jobPostingDetailSchema,
  recruiterNoteSchema,
} from "@shongre/contracts/employment";
import { DEFAULT_EMPLOYMENT_CATALOG } from "@shongre/contracts/employment-catalog";
import {
  EMPLOYMENT_DEMO_APPLICATIONS,
  EMPLOYMENT_DEMO_CANDIDATE_WORKSPACE,
  EMPLOYMENT_DEMO_INTERVIEWS,
  EMPLOYMENT_DEMO_JOBS,
  EMPLOYMENT_DEMO_RECRUITER_NOTES,
  EMPLOYMENT_DEMO_RECRUITER_WORKSPACE,
} from "@shongre/contracts/employment-demo";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { createHash, randomUUID } from "node:crypto";

const clone = <T>(value: T): T => structuredClone(value);

const parseEntitlementValue = (value: unknown) => {
  if (value === "true") return true;
  if (value === "false") return false;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (typeof value === "string" && (value.startsWith("[") || value.startsWith("{"))) {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
};

export type EmploymentAnalyticsEventName =
  | "search_performed"
  | "job_viewed"
  | "job_draft_saved"
  | "job_submitted"
  | "application_submitted"
  | "application_withdrawn"
  | "application_stage_changed"
  | "interview_scheduled"
  | "job_saved"
  | "alert_created"
  | "import_completed"
  | "checkout_completed";

export interface EmploymentAnalyticsEvent {
  eventName: EmploymentAnalyticsEventName;
  marketCode: string;
  jobId?: string;
  employerId?: string;
  anonymousSessionHash?: string;
  dimensions?: Record<string, unknown>;
  occurredAt?: string;
}

export interface EmploymentRepository {
  getCatalog(marketCode: string, includeInactive?: boolean): Promise<EmploymentCatalog>;
  search(query: EmploymentSearchQuery): Promise<EmploymentSearchResult>;
  getJob(idOrSlug: string): Promise<JobPostingDetail | null>;
  saveJob(job: JobPostingDetail, actorUserId?: string): Promise<JobPostingDetail>;
  createPrivateEmployer(userId: string, employer: EmployerSummary): Promise<EmployerSummary>;
  getEmployerStatus(employerId: string): Promise<"active" | "pending" | "suspended" | "closed" | null>;
  getDraft(id: string): Promise<JobDraft | null>;
  saveDraft(draft: JobDraft): Promise<JobDraft>;
  countActiveJobs(owner: { ownerUserId?: string; employerId?: string }): Promise<number>;
  findDuplicateJob(input: {
    employerId: string;
    title: string;
    professionId: string;
    city: string;
    excludeJobId?: string;
  }): Promise<JobPostingDetail[]>;
  getCandidateProfileForUser(userId: string): Promise<CandidateProfile | null>;
  getCandidateProfile(id: string): Promise<CandidateProfile | null>;
  saveCandidateProfile(profile: CandidateProfile): Promise<CandidateProfile>;
  getCandidateWorkspace(userId: string): Promise<CandidateWorkspace | null>;
  getConsentRecord(id: string): Promise<ConsentRecord | null>;
  saveConsentRecord(consent: ConsentRecord): Promise<ConsentRecord>;
  getApplication(id: string): Promise<EmploymentApplication | null>;
  findActiveApplication(jobId: string, candidateId: string): Promise<EmploymentApplication | null>;
  saveApplication(application: EmploymentApplication, expectedStageId?: string): Promise<EmploymentApplication>;
  listRecruiterEmployers(userId: string): Promise<EmployerSummary[]>;
  getRecruiterWorkspace(employerId: string): Promise<RecruiterWorkspace | null>;
  isRecruiterMember(userId: string, employerId: string): Promise<boolean>;
  canManageApplications(userId: string, employerId: string): Promise<boolean>;
  saveApplicationEvent(event: ApplicationEvent): Promise<ApplicationEvent>;
  saveRecruiterNote(note: RecruiterNote): Promise<RecruiterNote>;
  getInterview(id: string): Promise<EmploymentInterview | null>;
  saveInterview(interview: EmploymentInterview, actorUserId?: string): Promise<EmploymentInterview>;
  getImportByIdempotency(organizationId: string, key: string): Promise<EmploymentImport | null>;
  saveImport(job: EmploymentImport, actorUserId?: string): Promise<EmploymentImport>;
  toggleSavedJob(candidateId: string, jobId: string): Promise<boolean>;
  saveJobAlert(alert: JobAlert): Promise<JobAlert>;
  deleteJobAlert(candidateId: string, alertId: string): Promise<boolean>;
  saveDataSubjectRequest(
    request: EmploymentDataSubjectRequest,
  ): Promise<EmploymentDataSubjectRequest>;
  getOpenDataSubjectRequest(
    userId: string,
    requestType: EmploymentDataSubjectRequest["requestType"],
  ): Promise<EmploymentDataSubjectRequest | null>;
  saveJobReport(report: EmploymentJobReport): Promise<EmploymentJobReport>;
  saveModerationFlags(jobId: string, flags: ProhibitedLanguageFlag[]): Promise<void>;
  getAdminOverview(marketCode: string): Promise<EmploymentAdminOverview>;
  updateMarketConfig(marketCode: string, patch: Partial<EmploymentMarketConfig>, actorUserId?: string): Promise<EmploymentMarketConfig>;
  updateOffer(offerId: string, patch: Partial<EmploymentCatalog["offers"][number]>, actorUserId?: string): Promise<EmploymentCatalog["offers"][number]>;
  trackAnalyticsEvent(event: EmploymentAnalyticsEvent): Promise<void>;
}

const text = (job: JobPostingDetail) =>
  `${job.title} ${job.professionLabel} ${job.industryLabel} ${job.employer.name} ${job.requiredSkills.join(" ")} ${job.primaryLocation.city}`.toLocaleLowerCase("fr");

const matches = (query: EmploymentSearchQuery, job: JobPostingDetail) => {
  if (job.lifecycle !== "published" || job.marketCode !== query.marketCode) return false;
  if (query.keywords && !text(job).includes(query.keywords.toLocaleLowerCase("fr"))) return false;
  if (query.professionIds.length && !query.professionIds.includes(job.professionId)) return false;
  if (query.jobFamilyIds.length) {
    const profession = DEFAULT_EMPLOYMENT_CATALOG.dictionaries.find((entry) => entry.id === job.professionId);
    if (!profession?.parentId || !query.jobFamilyIds.includes(profession.parentId)) return false;
  }
  if (query.industryIds.length && !query.industryIds.includes(job.industryId)) return false;
  if (query.contractTypeIds.length && !query.contractTypeIds.includes(job.contractTypeId)) return false;
  if (query.workingArrangementIds.length && !query.workingArrangementIds.includes(job.workingArrangementId)) return false;
  if (query.workingTimeIds.length && !query.workingTimeIds.includes(job.workingTimeId)) return false;
  if (query.location && !job.primaryLocation.label.toLocaleLowerCase("fr").includes(query.location.toLocaleLowerCase("fr"))) return false;
  if (query.salaryMinimumMinor !== undefined) {
    const maximum = job.salary?.maximum?.amountMinor || job.salary?.minimum?.amountMinor;
    if (maximum === undefined || maximum < query.salaryMinimumMinor) return false;
  }
  if (query.salaryFrequencyId && job.salary?.frequencyId !== query.salaryFrequencyId) return false;
  if (query.experienceLevelIds.length && (!job.requiredExperienceId || !query.experienceLevelIds.includes(job.requiredExperienceId))) return false;
  if (query.educationLevelIds.length && (!job.educationLevelId || !query.educationLevelIds.includes(job.educationLevelId))) return false;
  if (query.languageIds.length && !job.languages.some((language) => query.languageIds.includes(language.levelId))) return false;
  if (query.scheduleIds.length && !job.workScheduleIds.some((scheduleId) => query.scheduleIds.includes(scheduleId))) return false;
  if (query.publishedSince && job.publishedAt < query.publishedSince) return false;
  if (query.verifiedEmployerOnly && !job.employer.isPubliclyVerified) return false;
  if (query.accessibilityOnly && !job.accessibilityInformation) return false;
  if (query.employerTypeIds.length && !query.employerTypeIds.includes(job.employer.employerTypeId)) return false;
  return true;
};

const relevance = (query: EmploymentSearchQuery, job: JobPostingDetail) => {
  const needle = query.keywords?.toLocaleLowerCase("fr").trim();
  let score = 0;
  if (needle) {
    if (job.title.toLocaleLowerCase("fr").includes(needle)) score += 100;
    if (job.professionLabel.toLocaleLowerCase("fr").includes(needle)) score += 60;
    if (job.requiredSkills.some((skill) => skill.toLocaleLowerCase("fr").includes(needle))) score += 30;
  }
  if (query.location && job.primaryLocation.city.toLocaleLowerCase("fr") === query.location.toLocaleLowerCase("fr")) score += 20;
  return score;
};

const distanceKm = (
  from: { latitude?: number; longitude?: number },
  to: { latitude?: number; longitude?: number },
) => {
  if (from.latitude === undefined || from.longitude === undefined || to.latitude === undefined || to.longitude === undefined)
    return Number.POSITIVE_INFINITY;
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) *
    Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const card = (job: JobPostingDetail) => {
  const {
    lifecycle: _lifecycle,
    marketCode: _marketCode,
    reference: _reference,
    positionsCount: _positionsCount,
    responsibilities: _responsibilities,
    requiredSkillIds: _requiredSkillIds,
    requiredSkills: _requiredSkills,
    preferredSkillIds: _preferredSkillIds,
    preferredSkills: _preferredSkills,
    requiredExperienceId: _requiredExperienceId,
    educationLevelId: _educationLevelId,
    qualificationSummary: _qualificationSummary,
    certifications: _certifications,
    languages: _languages,
    weeklyHours: _weeklyHours,
    workScheduleIds: _workScheduleIds,
    travelRequirementId: _travelRequirementId,
    additionalLocations: _additionalLocations,
    accessibilityInformation: _accessibilityInformation,
    benefits: _benefits,
    desiredStartDate: _desiredStartDate,
    recruitmentProcess: _recruitmentProcess,
    employerDescription: _employerDescription,
    applicationMethod: _applicationMethod,
    externalApplicationUrl: _externalApplicationUrl,
    contactPreferences: _contactPreferences,
    safetyNotice: _safetyNotice,
    candidateFeeRequired: _candidateFeeRequired,
    ...result
  } = job;
  return result;
};

export class DemoEmploymentRepository implements EmploymentRepository {
  protected catalog = clone(DEFAULT_EMPLOYMENT_CATALOG);
  protected jobs = new Map(EMPLOYMENT_DEMO_JOBS.map((job) => [job.id, clone(job)]));
  protected drafts = new Map<string, JobDraft>();
  protected applications = new Map(EMPLOYMENT_DEMO_APPLICATIONS.map((item) => [item.id, clone(item)]));
  protected interviews = new Map(EMPLOYMENT_DEMO_INTERVIEWS.map((item) => [item.id, clone(item)]));
  protected notes = new Map(EMPLOYMENT_DEMO_RECRUITER_NOTES.map((item) => [item.id, clone(item)]));
  protected imports = new Map(EMPLOYMENT_DEMO_RECRUITER_WORKSPACE.imports.map((item) => [item.id, clone(item)]));
  protected events = new Map<string, ApplicationEvent>();
  protected candidateWorkspaces = new Map([["user_thomas", clone(EMPLOYMENT_DEMO_CANDIDATE_WORKSPACE)]]);
  protected recruiterWorkspace = clone(EMPLOYMENT_DEMO_RECRUITER_WORKSPACE);
  protected savedJobs = new Map<string, Set<string>>([
    ["candidate-thomas", new Set(EMPLOYMENT_DEMO_CANDIDATE_WORKSPACE.savedJobs.map((job) => job.id))],
  ]);
  protected analytics: EmploymentAnalyticsEvent[] = [];
  protected dataSubjectRequests = new Map<string, EmploymentDataSubjectRequest>();
  protected consents = new Map(
    EMPLOYMENT_DEMO_CANDIDATE_WORKSPACE.consentHistory.map((consent) => [
      consent.id,
      clone(consent),
    ]),
  );
  protected jobReports = new Map<string, EmploymentJobReport>();
  protected moderationFlags = new Map<string, ProhibitedLanguageFlag[]>();

  async getCatalog(marketCode: string, includeInactive = false) {
    const code = marketCode.toUpperCase();
    const catalog = clone({
      ...this.catalog,
      activation: { ...this.catalog.activation, marketCode: code },
      config: { ...this.catalog.config, marketCode: code },
      dictionaries: this.catalog.dictionaries.map((entry) => ({ ...entry, marketCode: code })),
      offers: this.catalog.offers.map((offer) => ({ ...offer, marketCode: code })),
      addOns: this.catalog.addOns.map((addOn) => ({ ...addOn, marketCode: code })),
    });
    if (includeInactive) return catalog;
    return {
      ...catalog,
      dictionaries: catalog.dictionaries.filter((entry) => entry.isActive),
      offers: catalog.offers.filter((offer) => offer.isActive),
      addOns: catalog.addOns.filter((addOn) => addOn.isActive),
    };
  }

  async search(input: EmploymentSearchQuery): Promise<EmploymentSearchResult> {
    const query = employmentSearchQuerySchema.parse(input);
    const locationOrigin = query.location
      ? Array.from(this.jobs.values()).find((job) =>
          job.primaryLocation.label.toLocaleLowerCase("fr").includes(query.location!.toLocaleLowerCase("fr")),
        )?.primaryLocation
      : undefined;
    const locationQuery = query.radiusKm && locationOrigin
      ? { ...query, location: undefined, radiusKm: undefined }
      : query;
    const rows = Array.from(this.jobs.values()).filter((job) =>
      matches(locationQuery, job) &&
      (!query.radiusKm || !locationOrigin || distanceKm(locationOrigin, job.primaryLocation) <= query.radiusKm),
    );
    rows.sort((a, b) => {
      if (query.sort === "salary") {
        return (b.salary?.maximum?.amountMinor || b.salary?.minimum?.amountMinor || 0) - (a.salary?.maximum?.amountMinor || a.salary?.minimum?.amountMinor || 0);
      }
      if (query.sort === "deadline") return (a.applicationDeadline || a.expiresAt).localeCompare(b.applicationDeadline || b.expiresAt);
      if (query.sort === "distance" && locationOrigin)
        return distanceKm(locationOrigin, a.primaryLocation) - distanceKm(locationOrigin, b.primaryLocation);
      if (query.sort === "newest") return b.publishedAt.localeCompare(a.publishedAt);
      if (query.sort === "promoted") {
        const placement = Number(b.isFeatured) + Number(b.isSponsored) - Number(a.isFeatured) - Number(a.isSponsored);
        if (placement) return placement;
      }
      const score = relevance(query, b) - relevance(query, a);
      return score || b.publishedAt.localeCompare(a.publishedAt);
    });
    const offset = Number(query.cursor || 0);
    const items = rows.slice(offset, offset + query.limit).map(card);
    return {
      items,
      total: rows.length,
      organicResultCount: rows.filter((job) => !job.isSponsored).length,
      recommendationFactors: ["profession", "compétences", "localisation", "préférences de travail"],
      pageInfo: {
        hasNextPage: offset + query.limit < rows.length,
        nextCursor: offset + query.limit < rows.length ? String(offset + query.limit) : undefined,
      },
    };
  }

  async getJob(idOrSlug: string) {
    const job = this.jobs.get(idOrSlug) || Array.from(this.jobs.values()).find((item) => item.slug === idOrSlug);
    return job ? clone(job) : null;
  }
  async saveJob(job: JobPostingDetail, _actorUserId?: string) {
    const parsed = jobPostingDetailSchema.parse(job);
    this.jobs.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async getEmployerStatus(employerId: string) {
    if (employerId.includes("suspended")) return "suspended" as const;
    return "active" as const;
  }
  async createPrivateEmployer(_userId: string, employer: EmployerSummary) {
    return clone(employer);
  }
  async getDraft(id: string) {
    return this.drafts.has(id) ? clone(this.drafts.get(id)!) : null;
  }
  async saveDraft(draft: JobDraft) {
    const parsed = jobDraftSchema.parse(draft);
    this.drafts.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async countActiveJobs(owner: { ownerUserId?: string; employerId?: string }) {
    if (owner.employerId) return Array.from(this.jobs.values()).filter((job) => job.employer.id === owner.employerId && ["pending_review", "published"].includes(job.lifecycle)).length;
    return 0;
  }
  async findDuplicateJob(input: { employerId: string; title: string; professionId: string; city: string; excludeJobId?: string }) {
    const normalize = (value: string) => value.trim().toLocaleLowerCase("fr");
    return Array.from(this.jobs.values()).filter((job) =>
      job.id !== input.excludeJobId &&
      job.employer.id === input.employerId &&
      normalize(job.title) === normalize(input.title) &&
      job.professionId === input.professionId &&
      normalize(job.primaryLocation.city) === normalize(input.city) &&
      ["pending_review", "published"].includes(job.lifecycle),
    ).map(clone);
  }
  async getCandidateProfileForUser(userId: string) {
    const workspace = this.candidateWorkspaces.get(userId);
    return workspace ? clone(workspace.profile) : null;
  }
  async getCandidateProfile(id: string) {
    const workspace = Array.from(this.candidateWorkspaces.values()).find(
      (candidate) => candidate.profile.id === id,
    );
    return workspace ? clone(workspace.profile) : null;
  }
  async saveCandidateProfile(profile: CandidateProfile) {
    const parsed = candidateProfileSchema.parse(profile);
    const workspace = this.candidateWorkspaces.get(parsed.userId) || clone(EMPLOYMENT_DEMO_CANDIDATE_WORKSPACE);
    workspace.profile = clone(parsed);
    this.candidateWorkspaces.set(parsed.userId, workspace);
    return clone(parsed);
  }
  async getCandidateWorkspace(userId: string) {
    const workspace = this.candidateWorkspaces.get(userId);
    if (!workspace) return null;
    const applications = Array.from(this.applications.values())
      .filter((item) => item.candidateId === workspace.profile.id)
      .map(({ screeningAnswers: _answers, ...item }) => clone(item));
    return clone({
      ...workspace,
      consentHistory: Array.from(this.consents.values()).filter(
        (consent) => consent.subjectUserId === userId,
      ),
      applications,
      interviews: Array.from(this.interviews.values()).filter((interview) => applications.some((item) => item.id === interview.applicationId)),
      savedJobs: Array.from(this.savedJobs.get(workspace.profile.id) || []).map((id) => this.jobs.get(id)).filter((job): job is JobPostingDetail => Boolean(job)).map(card),
    });
  }
  async getConsentRecord(id: string) {
    const consent = this.consents.get(id);
    return consent ? clone(consent) : null;
  }
  async saveConsentRecord(consent: ConsentRecord) {
    const parsed = consentRecordSchema.parse(consent);
    this.consents.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async getApplication(id: string) {
    return this.applications.has(id) ? clone(this.applications.get(id)!) : null;
  }
  async findActiveApplication(jobId: string, candidateId: string) {
    const found = Array.from(this.applications.values()).find((item) => item.jobId === jobId && item.candidateId === candidateId && !["withdrawn", "rejected", "archived"].includes(item.systemState));
    return found ? clone(found) : null;
  }
  async saveApplication(application: EmploymentApplication, expectedStageId?: string) {
    const parsed = applicationSchema.parse(application);
    if (expectedStageId) {
      const current = this.applications.get(parsed.id);
      if (!current || current.stageId !== expectedStageId)
        throw new Error("EMPLOYMENT_STAGE_CONFLICT");
    }
    this.applications.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async getRecruiterWorkspace(employerId: string): Promise<RecruiterWorkspace | null> {
    if (employerId === "employer-private-martin") {
      const employer = EMPLOYMENT_DEMO_JOBS.find(
        (job) => job.employer.id === employerId,
      )!.employer;
      return clone({
        employer,
        jobs: Array.from(this.jobs.values())
          .filter((job) => job.employer.id === employerId)
          .map(card),
        applications: Array.from(this.applications.values()).filter(
          (application) => this.jobs.get(application.jobId)?.employer.id === employerId,
        ),
        stages: this.recruiterWorkspace.stages,
        interviews: [],
        recruiterNotes: [],
        imports: [],
        members: [{
          id: "membership-private-camille",
          userId: "user_camille",
          displayName: "Camille Martin",
          role: "owner",
          branchIds: [],
          clientEmployerIds: [],
          permissions: ["job.manage", "application.manage", "interview.manage"],
          status: "active",
        }],
        activeOfferId: "employment.employer.free",
        entitlements: {
          maxActiveJobs: 1,
          maxRecruiterSeats: 1,
          candidateAssignment: false,
          privateRecruiterNotes: true,
          interviewScheduling: true,
          advancedAnalytics: false,
          csvImport: false,
          apiSync: false,
        },
      });
    }
    if (this.recruiterWorkspace.employer.id !== employerId) return null;
    return clone({
      ...this.recruiterWorkspace,
      jobs: Array.from(this.jobs.values()).filter((job) => job.employer.id === employerId).map(card),
      applications: Array.from(this.applications.values()).filter((application) => {
        const job = this.jobs.get(application.jobId);
        return job?.employer.id === employerId;
      }),
      interviews: Array.from(this.interviews.values()),
      recruiterNotes: Array.from(this.notes.values()),
      imports: Array.from(this.imports.values()),
      members: this.recruiterWorkspace.members,
    });
  }
  async listRecruiterEmployers(userId: string) {
    const privateEmployer = EMPLOYMENT_DEMO_JOBS.find(
      (job) => job.employer.id === "employer-private-martin",
    )!.employer;
    if (userId === "user_admin_antoine")
      return clone([this.recruiterWorkspace.employer, privateEmployer]);
    if (userId === "user_pro_atelier") return clone([this.recruiterWorkspace.employer]);
    if (userId === "user_camille") return clone([privateEmployer]);
    return [];
  }
  async isRecruiterMember(userId: string, employerId: string) {
    return (await this.listRecruiterEmployers(userId)).some((employer) => employer.id === employerId);
  }
  async canManageApplications(userId: string, employerId: string) {
    return (await this.listRecruiterEmployers(userId)).some((employer) => employer.id === employerId);
  }
  async saveApplicationEvent(event: ApplicationEvent) {
    const parsed = applicationEventSchema.parse(event);
    this.events.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async saveRecruiterNote(note: RecruiterNote) {
    const parsed = recruiterNoteSchema.parse(note);
    this.notes.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async getInterview(id: string) {
    const interview = this.interviews.get(id);
    return interview ? clone(interview) : null;
  }
  async saveInterview(interview: EmploymentInterview, _actorUserId?: string) {
    const parsed = interviewSchema.parse(interview);
    this.interviews.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async getImportByIdempotency(organizationId: string, key: string) {
    const found = Array.from(this.imports.values()).find((item) => item.organizationId === organizationId && item.idempotencyKey === key);
    return found ? clone(found) : null;
  }
  async saveImport(job: EmploymentImport, _actorUserId?: string) {
    const parsed = employmentImportSchema.parse(job);
    this.imports.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async toggleSavedJob(candidateId: string, jobId: string) {
    const bucket = this.savedJobs.get(candidateId) || new Set<string>();
    if (bucket.has(jobId)) bucket.delete(jobId);
    else bucket.add(jobId);
    this.savedJobs.set(candidateId, bucket);
    return bucket.has(jobId);
  }
  async saveJobAlert(alert: JobAlert) {
    const parsed = jobAlertSchema.parse(alert);
    const workspace = Array.from(this.candidateWorkspaces.values()).find(
      (candidate) => candidate.profile.id === parsed.candidateId,
    );
    if (!workspace) throw new Error("Profil candidat introuvable.");
    workspace.alerts = [clone(parsed), ...workspace.alerts.filter((item) => item.id !== parsed.id)];
    return clone(parsed);
  }
  async deleteJobAlert(candidateId: string, alertId: string) {
    const workspace = Array.from(this.candidateWorkspaces.values()).find(
      (candidate) => candidate.profile.id === candidateId,
    );
    if (!workspace) return false;
    const before = workspace.alerts.length;
    workspace.alerts = workspace.alerts.filter((alert) => alert.id !== alertId);
    return workspace.alerts.length < before;
  }
  async saveDataSubjectRequest(request: EmploymentDataSubjectRequest) {
    const parsed = employmentDataSubjectRequestSchema.parse(request);
    this.dataSubjectRequests.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async getOpenDataSubjectRequest(
    userId: string,
    requestType: EmploymentDataSubjectRequest["requestType"],
  ) {
    const request = Array.from(this.dataSubjectRequests.values()).find(
      (item) =>
        item.subjectUserId === userId &&
        item.requestType === requestType &&
        !["completed", "cancelled"].includes(item.status),
    );
    return request ? clone(request) : null;
  }
  async saveJobReport(report: EmploymentJobReport) {
    const parsed = employmentJobReportSchema.parse(report);
    const existing = Array.from(this.jobReports.values()).find(
      (item) => item.jobId === parsed.jobId && item.reporterUserId === parsed.reporterUserId && item.reason === parsed.reason,
    );
    if (existing) return clone(existing);
    this.jobReports.set(parsed.id, clone(parsed));
    return clone(parsed);
  }
  async saveModerationFlags(jobId: string, flags: ProhibitedLanguageFlag[]) {
    this.moderationFlags.set(jobId, clone(flags));
  }
  async getAdminOverview(marketCode: string): Promise<EmploymentAdminOverview> {
    return {
      catalog: await this.getCatalog(marketCode, true),
      employerCounts: { active: 483, verified: 296, suspended: 7, private: 82 },
      jobCounts: { published: 2841, pending_review: 37, expired: 416, flagged: 12 },
      applicationCounts: { received: 6820, interview: 614, offer: 103, hired: 72 },
      importErrorCount: Array.from(this.imports.values()).reduce((sum, item) => sum + item.errorCount, 0),
      moderationQueueCount: 37,
      prohibitedLanguageReviewCount: 9,
    };
  }
  async updateMarketConfig(marketCode: string, patch: Partial<EmploymentMarketConfig>, _actorUserId?: string) {
    if (this.catalog.config.marketCode !== marketCode.toUpperCase()) throw new Error("Marché Emploi introuvable.");
    this.catalog.config = { ...this.catalog.config, ...clone(patch) };
    this.catalog.activation.isActive = this.catalog.config.isEnabled;
    return clone(this.catalog.config);
  }
  async updateOffer(offerId: string, patch: Partial<EmploymentCatalog["offers"][number]>, _actorUserId?: string) {
    const index = this.catalog.offers.findIndex((offer) => offer.id === offerId);
    if (index < 0) throw new Error("Offre Emploi introuvable.");
    this.catalog.offers[index] = { ...this.catalog.offers[index], ...clone(patch), verticalType: "employment" };
    return clone(this.catalog.offers[index]);
  }
  async trackAnalyticsEvent(event: EmploymentAnalyticsEvent) {
    const dimensions = { ...(event.dimensions || {}) };
    for (const key of ["candidateName", "candidateEmail", "cvUrl", "coverMessage", "screeningAnswers"]) delete dimensions[key];
    this.analytics.push({ ...clone(event), dimensions, occurredAt: event.occurredAt || new Date().toISOString() });
  }
}

/** Database adapter. Authorization remains in EmploymentService and PostgreSQL RLS. */
export class PostgresEmploymentRepository extends DemoEmploymentRepository {
  private db() {
    return getSupabaseAdminClient() as any;
  }

  private async hydrateJobs(rows: any[]): Promise<JobPostingDetail[]> {
    if (!rows.length) return [];
    const dictionaryIds = new Set<string>();
    for (const row of rows) {
      for (const id of [
        row.profession_id,
        row.specialization_id,
        row.industry_id,
        row.contract_type_id,
        row.working_arrangement_id,
        row.working_time_id,
        row.required_experience_id,
        row.education_level_id,
      ]) if (id) dictionaryIds.add(id);
      for (const skill of row.skills || []) dictionaryIds.add(skill.skill_id);
      for (const language of row.languages || []) dictionaryIds.add(language.level_id);
    }
    const dictionaryResult = dictionaryIds.size
      ? await this.db()
          .from("employment_dictionary_entries")
          .select("id,label,parent_id")
          .in("id", Array.from(dictionaryIds))
      : { data: [], error: null };
    if (dictionaryResult.error) throw dictionaryResult.error;
    const labels = new Map(
      (dictionaryResult.data || []).map((entry: any) => [entry.id, entry.label]),
    );
    return rows.map((row) => {
      const employer = Array.isArray(row.employer) ? row.employer[0] : row.employer;
      const locations = [...(row.locations || [])].sort(
        (a: any, b: any) => Number(b.is_primary) - Number(a.is_primary),
      );
      const primary = locations.find((location: any) => location.is_primary) || locations[0];
      if (!employer || !primary)
        throw new Error(`Offre Emploi ${row.id} incomplète: employeur ou localisation absent.`);
      const skills = [...(row.skills || [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
      const requiredSkills = skills.filter((skill: any) => skill.requirement === "required");
      const preferredSkills = skills.filter((skill: any) => skill.requirement === "preferred");
      const verified = ["domain_verified", "manually_verified", "provider_verified"].includes(
        employer.verification_level,
      );
      return jobPostingDetailSchema.parse({
        id: row.id,
        slug: row.slug,
        schemaVersion: row.schema_version,
        title: row.title,
        employer: {
          id: employer.id,
          organizationId: employer.organization_id || undefined,
          branchId: row.branch_id || undefined,
          name: employer.display_name,
          slug: employer.slug,
          employerTypeId: employer.employer_type_id,
          description: employer.description || undefined,
          logoUrl: employer.logo_url || undefined,
          websiteUrl: employer.website_url || undefined,
          verificationLevel: employer.verification_level,
          isPubliclyVerified: verified,
        },
        professionId: row.profession_id,
        professionLabel: labels.get(row.profession_id) || row.profession_id,
        specializationId: row.specialization_id || undefined,
        specializationLabel: row.specialization_id
          ? labels.get(row.specialization_id) || row.specialization_id
          : undefined,
        industryId: row.industry_id,
        industryLabel: labels.get(row.industry_id) || row.industry_id,
        contractTypeId: row.contract_type_id,
        contractTypeLabel: labels.get(row.contract_type_id) || row.contract_type_id,
        workingArrangementId: row.working_arrangement_id,
        workingArrangementLabel:
          labels.get(row.working_arrangement_id) || row.working_arrangement_id,
        workingTimeId: row.working_time_id,
        primaryLocation: {
          id: primary.id,
          label: primary.label,
          city: primary.city,
          postalCode: primary.postal_code || undefined,
          countryCode: primary.country_code,
          latitude: primary.latitude == null ? undefined : Number(primary.latitude),
          longitude: primary.longitude == null ? undefined : Number(primary.longitude),
          isPrimary: true,
          isPublic: primary.is_public,
        },
        salary:
          row.salary_minimum_minor == null && row.salary_maximum_minor == null
            ? undefined
            : {
                minimum:
                  row.salary_minimum_minor == null
                    ? undefined
                    : {
                        amountMinor: Number(row.salary_minimum_minor),
                        currency: row.salary_currency,
                      },
                maximum:
                  row.salary_maximum_minor == null
                    ? undefined
                    : {
                        amountMinor: Number(row.salary_maximum_minor),
                        currency: row.salary_currency,
                      },
                frequencyId: row.salary_frequency_id,
                presentationId: row.salary_presentation_id || "gross",
                isPublic: row.salary_is_public,
                bonusDescription: row.salary_bonus_description || undefined,
              },
        publishedAt: row.published_at || row.created_at,
        expiresAt: row.expires_at,
        applicationDeadline: row.application_deadline || undefined,
        isUrgent: row.is_urgent,
        isFeatured: row.is_featured,
        isSponsored: row.is_sponsored,
        saved: false,
        lifecycle: row.lifecycle,
        marketCode: row.market_code,
        reference: row.reference || undefined,
        positionsCount: row.positions_count,
        contractDuration: row.contract_duration_text || undefined,
        responsibilities: row.responsibilities,
        requiredSkillIds: requiredSkills.map((skill: any) => skill.skill_id),
        requiredSkills: requiredSkills.map(
          (skill: any) => labels.get(skill.skill_id) || skill.skill_id,
        ),
        preferredSkillIds: preferredSkills.map((skill: any) => skill.skill_id),
        preferredSkills: preferredSkills.map(
          (skill: any) => labels.get(skill.skill_id) || skill.skill_id,
        ),
        requiredExperienceId: row.required_experience_id || undefined,
        educationLevelId: row.education_level_id || undefined,
        qualificationSummary: row.qualification_summary || undefined,
        certifications: row.certifications || [],
        languages: (row.languages || []).map((language: any) => ({
          languageId: language.language_id,
          levelId: language.level_id,
          label: language.label,
        })),
        weeklyHours: row.weekly_hours == null ? undefined : Number(row.weekly_hours),
        workScheduleIds: row.work_schedule_ids || [],
        travelRequirementId: row.travel_requirement_id || undefined,
        additionalLocations: locations.filter((location: any) => !location.is_primary).map((location: any) => ({
          id: location.id,
          label: location.label,
          city: location.city,
          postalCode: location.postal_code || undefined,
          countryCode: location.country_code,
          latitude: location.latitude == null ? undefined : Number(location.latitude),
          longitude: location.longitude == null ? undefined : Number(location.longitude),
          isPrimary: false,
          isPublic: location.is_public,
        })),
        accessibilityInformation: row.accessibility_information || undefined,
        benefits: row.benefits || [],
        trialPeriodInformation: row.trial_period_information || undefined,
        desiredStartDate: row.desired_start_date || undefined,
        recruitmentProcess: row.recruitment_process || [],
        employerDescription: employer.description || undefined,
        applicationMethod: row.application_method,
        externalApplicationUrl: row.external_application_url || undefined,
        contactPreferences: row.contact_preferences || [],
        screeningQuestions: (row.questions || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((question: any) => ({
          id: question.id,
          questionTypeId: question.question_type_id,
          label: question.label,
          helpText: question.help_text || undefined,
          isRequired: question.is_required,
          options: question.options || [],
          disqualifyingAnswerIds: question.disqualifying_answer_ids || [],
        })),
        safetyNotice:
          "Aucun paiement ne peut être demandé à un candidat pour postuler sur Shongre.",
        candidateFeeRequired: false,
      });
    });
  }

  private jobSelect() {
    return "*, employer:employment_employer_profiles!employment_jobs_employer_id_fkey(*), locations:employment_job_locations(*), skills:employment_job_skills(*), languages:employment_job_languages(*), questions:employment_screening_questions(*)";
  }

  override async getJob(idOrSlug: string) {
    const column = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug)
      ? "id"
      : "slug";
    const { data, error } = await this.db()
      .from("employment_jobs")
      .select(this.jobSelect())
      .eq(column, idOrSlug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return (await this.hydrateJobs([data]))[0];
  }

  override async search(input: EmploymentSearchQuery): Promise<EmploymentSearchResult> {
    const query = employmentSearchQuerySchema.parse(input);
    let jobIds: string[] | undefined;
    const distanceByJob = new Map<string, number>();
    if (query.location) {
      const safeLocation = query.location.replace(/[^\p{L}\p{N}\s'-]/gu, "").trim();
      if (!safeLocation)
        return { items: [], total: 0, organicResultCount: 0, recommendationFactors: [], pageInfo: { hasNextPage: false } };
      const { data, error } = await this.db()
        .from("employment_job_locations")
        .select("job_id,latitude,longitude")
        .or(`city.ilike.%${safeLocation}%,label.ilike.%${safeLocation}%`)
        .limit(10000);
      if (error) throw error;
      const center = (data || []).find(
        (row: any) => row.latitude != null && row.longitude != null,
      );
      if (query.radiusKm && center) {
        const nearby = await this.db().rpc("employment_job_ids_within_radius", {
          p_latitude: Number(center.latitude),
          p_longitude: Number(center.longitude),
          p_radius_km: query.radiusKm,
        });
        if (nearby.error) throw nearby.error;
        for (const row of nearby.data || [])
          distanceByJob.set(String(row.job_id), Number(row.distance_km));
        jobIds = Array.from(distanceByJob.keys());
      } else {
        jobIds = Array.from(new Set((data || []).map((row: any) => row.job_id)));
      }
      if (!jobIds.length) return { items: [], total: 0, organicResultCount: 0, recommendationFactors: [], pageInfo: { hasNextPage: false } };
    }
    if (query.jobFamilyIds.length) {
      const { data, error } = await this.db()
        .from("employment_dictionary_entries")
        .select("id")
        .in("parent_id", query.jobFamilyIds)
        .eq("kind", "profession")
        .eq("is_active", true);
      if (error) throw error;
      const professions = (data || []).map((row: any) => row.id);
      if (!professions.length) return { items: [], total: 0, organicResultCount: 0, recommendationFactors: [], pageInfo: { hasNextPage: false } };
      query.professionIds = Array.from(new Set([...query.professionIds, ...professions]));
    }
    if (query.languageIds.length) {
      const { data, error } = await this.db()
        .from("employment_job_languages")
        .select("job_id")
        .in("level_id", query.languageIds)
        .limit(10000);
      if (error) throw error;
      const languageIds = new Set<string>((data || []).map((row: any) => String(row.job_id)));
      jobIds = (jobIds || Array.from(languageIds)).filter((id) => languageIds.has(id));
      if (!jobIds?.length) return { items: [], total: 0, organicResultCount: 0, recommendationFactors: [], pageInfo: { hasNextPage: false } };
    }
    if (query.employerTypeIds.length || query.verifiedEmployerOnly) {
      let employers = this.db().from("employment_employer_profiles").select("id").eq("status", "active");
      if (query.employerTypeIds.length) employers = employers.in("employer_type_id", query.employerTypeIds);
      if (query.verifiedEmployerOnly) employers = employers.in("verification_level", ["domain_verified", "manually_verified", "provider_verified"]);
      const { data, error } = await employers;
      if (error) throw error;
      const employerIds = (data || []).map((row: any) => row.id);
      if (!employerIds.length) return { items: [], total: 0, organicResultCount: 0, recommendationFactors: [], pageInfo: { hasNextPage: false } };
      let existing = this.db().from("employment_jobs").select("id").in("employer_id", employerIds);
      if (jobIds) existing = existing.in("id", jobIds);
      const result = await existing;
      if (result.error) throw result.error;
      jobIds = (result.data || []).map((row: any) => row.id);
    }
    let statement = this.db()
      .from("employment_jobs")
      .select("id,is_sponsored", { count: "exact" })
      .eq("market_code", query.marketCode)
      .eq("lifecycle", "published")
      .eq("moderation_status", "approved")
      .gt("expires_at", new Date().toISOString());
    if (jobIds) statement = statement.in("id", jobIds);
    if (query.keywords) {
      const escaped = query.keywords.replace(/[^\p{L}\p{N}\s'+#.-]/gu, "").trim();
      if (!escaped)
        return { items: [], total: 0, organicResultCount: 0, recommendationFactors: [], pageInfo: { hasNextPage: false } };
      statement = statement.or(`title.ilike.%${escaped}%,qualification_summary.ilike.%${escaped}%`);
    }
    if (query.professionIds.length) statement = statement.in("profession_id", query.professionIds);
    if (query.industryIds.length) statement = statement.in("industry_id", query.industryIds);
    if (query.contractTypeIds.length) statement = statement.in("contract_type_id", query.contractTypeIds);
    if (query.workingArrangementIds.length) statement = statement.in("working_arrangement_id", query.workingArrangementIds);
    if (query.workingTimeIds.length) statement = statement.in("working_time_id", query.workingTimeIds);
    if (query.experienceLevelIds.length) statement = statement.in("required_experience_id", query.experienceLevelIds);
    if (query.educationLevelIds.length) statement = statement.in("education_level_id", query.educationLevelIds);
    if (query.scheduleIds.length) statement = statement.overlaps("work_schedule_ids", query.scheduleIds);
    if (query.salaryMinimumMinor !== undefined) statement = statement.gte("salary_maximum_minor", query.salaryMinimumMinor).eq("salary_is_public", true);
    if (query.salaryFrequencyId) statement = statement.eq("salary_frequency_id", query.salaryFrequencyId);
    if (query.publishedSince) statement = statement.gte("published_at", query.publishedSince);
    if (query.accessibilityOnly) statement = statement.not("accessibility_information", "is", null);
    if (query.sort === "salary") statement = statement.order("salary_maximum_minor", { ascending: false, nullsFirst: false });
    else if (query.sort === "deadline") statement = statement.order("application_deadline", { ascending: true, nullsFirst: false });
    else if (query.sort === "promoted") statement = statement.order("is_featured", { ascending: false }).order("is_sponsored", { ascending: false }).order("published_at", { ascending: false });
    else statement = statement.order("published_at", { ascending: false });
    const offset = Number(query.cursor || 0);
    const result = await statement.range(offset, offset + query.limit - 1);
    if (result.error) throw result.error;
    const orderedIds: string[] = (result.data || []).map((row: any) => String(row.id));
    if (!orderedIds.length) return { items: [], total: result.count || 0, organicResultCount: 0, recommendationFactors: ["profession", "compétences", "localisation", "préférences de travail"], pageInfo: { hasNextPage: false } };
    const detailsResult = await this.db()
      .from("employment_jobs")
      .select(this.jobSelect())
      .in("id", orderedIds);
    if (detailsResult.error) throw detailsResult.error;
    const hydrated = await this.hydrateJobs(detailsResult.data || []);
    const byId = new Map(hydrated.map((job) => [job.id, job]));
    const jobs = orderedIds.map((id) => byId.get(id)).filter((job): job is JobPostingDetail => Boolean(job));
    if (query.sort === "distance" && distanceByJob.size)
      jobs.sort(
        (a, b) =>
          (distanceByJob.get(a.id) ?? Number.POSITIVE_INFINITY) -
          (distanceByJob.get(b.id) ?? Number.POSITIVE_INFINITY),
      );
    const total = result.count || 0;
    const sponsoredOnPage = (result.data || []).filter((row: any) => row.is_sponsored).length;
    return {
      items: jobs.map(card),
      total,
      organicResultCount: Math.max(0, total - sponsoredOnPage),
      recommendationFactors: ["profession", "compétences", "localisation", "préférences de travail"],
      pageInfo: {
        hasNextPage: offset + jobs.length < total,
        nextCursor: offset + jobs.length < total ? String(offset + jobs.length) : undefined,
      },
    };
  }

  override async saveJob(job: JobPostingDetail, actorUserId?: string) {
    const parsed = jobPostingDetailSchema.parse(job);
    if (!actorUserId) throw new Error("Un auteur est requis pour enregistrer une offre Emploi.");
    const fingerprint = createHash("sha256")
      .update(
        [parsed.employer.id, parsed.title.trim().toLocaleLowerCase("fr"), parsed.professionId, parsed.primaryLocation.city.trim().toLocaleLowerCase("fr")].join("|"),
      )
      .digest("hex");
    const row = {
      id: parsed.id,
      employer_id: parsed.employer.id,
      branch_id: parsed.employer.branchId || null,
      created_by_user_id: actorUserId,
      market_code: parsed.marketCode,
      schema_version: parsed.schemaVersion,
      slug: parsed.slug,
      reference: parsed.reference || null,
      title: parsed.title,
      profession_id: parsed.professionId,
      specialization_id: parsed.specializationId || null,
      industry_id: parsed.industryId,
      contract_type_id: parsed.contractTypeId,
      contract_duration_text: parsed.contractDuration || null,
      working_arrangement_id: parsed.workingArrangementId,
      working_time_id: parsed.workingTimeId,
      work_schedule_ids: parsed.workScheduleIds,
      positions_count: parsed.positionsCount,
      weekly_hours: parsed.weeklyHours || null,
      responsibilities: parsed.responsibilities,
      qualification_summary: parsed.qualificationSummary || null,
      required_experience_id: parsed.requiredExperienceId || null,
      education_level_id: parsed.educationLevelId || null,
      certifications: parsed.certifications,
      travel_requirement_id: parsed.travelRequirementId || null,
      accessibility_information: parsed.accessibilityInformation || null,
      benefits: parsed.benefits,
      trial_period_information: parsed.trialPeriodInformation || null,
      desired_start_date: parsed.desiredStartDate || null,
      application_deadline: parsed.applicationDeadline || null,
      recruitment_process: parsed.recruitmentProcess,
      application_method: parsed.applicationMethod,
      external_application_url: parsed.externalApplicationUrl || null,
      contact_preferences: parsed.contactPreferences,
      lifecycle: parsed.lifecycle,
      moderation_status: parsed.lifecycle === "published" ? "approved" : "pending",
      salary_minimum_minor: parsed.salary?.minimum?.amountMinor ?? null,
      salary_maximum_minor: parsed.salary?.maximum?.amountMinor ?? null,
      salary_currency: parsed.salary?.minimum?.currency || parsed.salary?.maximum?.currency || null,
      salary_frequency_id: parsed.salary?.frequencyId || null,
      salary_presentation_id: parsed.salary?.presentationId || null,
      salary_is_public: parsed.salary?.isPublic || false,
      salary_bonus_description: parsed.salary?.bonusDescription || null,
      promotion: {
        urgent: parsed.isUrgent,
        featured: parsed.isFeatured,
        sponsored: parsed.isSponsored,
      },
      is_urgent: parsed.isUrgent,
      is_featured: parsed.isFeatured,
      is_sponsored: parsed.isSponsored,
      duplicate_fingerprint: fingerprint,
      published_at: parsed.publishedAt,
      expires_at: parsed.expiresAt,
      updated_at: new Date().toISOString(),
    };
    const saved = await this.db().from("employment_jobs").upsert(row).select("id").single();
    if (saved.error) throw saved.error;
    try {
      for (const table of [
        "employment_job_locations",
        "employment_job_skills",
        "employment_job_languages",
        "employment_screening_questions",
      ]) {
        const result = await this.db().from(table).delete().eq("job_id", parsed.id);
        if (result.error) throw result.error;
      }
      const uuid = (value: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
          ? value
          : randomUUID();
      const locations = [parsed.primaryLocation, ...parsed.additionalLocations].map((location, index) => ({
        id: uuid(location.id),
        job_id: parsed.id,
        label: location.label,
        city: location.city,
        postal_code: location.postalCode || null,
        country_code: location.countryCode,
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
        is_primary: index === 0,
        is_public: location.isPublic,
      }));
      const locationResult = await this.db().from("employment_job_locations").insert(locations);
      if (locationResult.error) throw locationResult.error;
      const skills = [
        ...parsed.requiredSkillIds.map((skillId, index) => ({ job_id: parsed.id, skill_id: skillId, requirement: "required", sort_order: index * 10 })),
        ...parsed.preferredSkillIds.map((skillId, index) => ({ job_id: parsed.id, skill_id: skillId, requirement: "preferred", sort_order: index * 10 })),
      ];
      if (skills.length) {
        const skillResult = await this.db().from("employment_job_skills").insert(skills);
        if (skillResult.error) throw skillResult.error;
      }
      if (parsed.languages.length) {
        const languageResult = await this.db().from("employment_job_languages").insert(
          parsed.languages.map((language) => ({
            job_id: parsed.id,
            language_id: language.languageId,
            level_id: language.levelId,
            label: language.label,
            is_required: true,
          })),
        );
        if (languageResult.error) throw languageResult.error;
      }
      if (parsed.screeningQuestions.length) {
        const questionResult = await this.db().from("employment_screening_questions").insert(
          parsed.screeningQuestions.map((question, index) => ({
            id: uuid(question.id),
            job_id: parsed.id,
            question_type_id: question.questionTypeId,
            label: question.label,
            help_text: question.helpText || null,
            is_required: question.isRequired,
            options: question.options,
            disqualifying_answer_ids: question.disqualifyingAnswerIds,
            sort_order: index * 10,
          })),
        );
        if (questionResult.error) throw questionResult.error;
      }
    } catch (error) {
      await this.db().from("employment_jobs").delete().eq("id", parsed.id);
      throw error;
    }
    const result = await this.getJob(parsed.id);
    if (!result) throw new Error("L’offre Emploi enregistrée ne peut pas être relue.");
    return result;
  }

  override async getDraft(id: string) {
    const { data, error } = await this.db()
      .from("employment_job_drafts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return jobDraftSchema.parse({
      id: data.id,
      ownerUserId: data.owner_user_id,
      employerId: data.employer_id || undefined,
      branchId: data.branch_id || undefined,
      privateEmployer: data.private_employer,
      marketCode: data.market_code,
      schemaVersion: data.schema_version,
      currentStep: data.current_step,
      completedSteps: data.completed_steps,
      data: data.data,
      screeningQuestions: data.data?.screeningQuestions || [],
      selectedOfferId: data.selected_offer_id || undefined,
      selectedAddOnIds: data.selected_add_on_ids,
      validationIssues: data.validation_issues,
      duplicateCandidateIds: data.duplicate_fingerprints,
      updatedAt: data.updated_at,
    });
  }

  override async saveDraft(draft: JobDraft) {
    const parsed = jobDraftSchema.parse(draft);
    const catalog = await this.getCatalog(parsed.marketCode, true);
    const expiresAt = new Date(
      Date.now() + catalog.config.draftRetentionDays * 86_400_000,
    ).toISOString();
    const { error } = await this.db().from("employment_job_drafts").upsert({
      id: parsed.id,
      owner_user_id: parsed.ownerUserId,
      employer_id: parsed.employerId || null,
      branch_id: parsed.branchId || null,
      private_employer: parsed.privateEmployer,
      market_code: parsed.marketCode,
      schema_version: parsed.schemaVersion,
      current_step: parsed.currentStep,
      completed_steps: parsed.completedSteps,
      data: { ...parsed.data, screeningQuestions: parsed.screeningQuestions },
      selected_offer_id: parsed.selectedOfferId || null,
      selected_add_on_ids: parsed.selectedAddOnIds,
      duplicate_fingerprints: parsed.duplicateCandidateIds,
      validation_issues: parsed.validationIssues,
      expires_at: expiresAt,
      updated_at: parsed.updatedAt,
    });
    if (error) throw error;
    const saved = await this.getDraft(parsed.id);
    if (!saved) throw new Error("Le brouillon Emploi enregistré ne peut pas être relu.");
    return saved;
  }

  override async countActiveJobs(owner: { ownerUserId?: string; employerId?: string }) {
    let statement = this.db()
      .from("employment_jobs")
      .select("id", { count: "exact", head: true })
      .in("lifecycle", ["pending_review", "published"]);
    if (owner.employerId) statement = statement.eq("employer_id", owner.employerId);
    if (owner.ownerUserId) statement = statement.eq("created_by_user_id", owner.ownerUserId);
    const { count, error } = await statement;
    if (error) throw error;
    return count || 0;
  }

  override async findDuplicateJob(input: {
    employerId: string;
    title: string;
    professionId: string;
    city: string;
    excludeJobId?: string;
  }) {
    const fingerprint = createHash("sha256")
      .update([input.employerId, input.title.trim().toLocaleLowerCase("fr"), input.professionId, input.city.trim().toLocaleLowerCase("fr")].join("|"))
      .digest("hex");
    let statement = this.db()
      .from("employment_jobs")
      .select(this.jobSelect())
      .eq("employer_id", input.employerId)
      .eq("duplicate_fingerprint", fingerprint)
      .in("lifecycle", ["pending_review", "published"]);
    if (input.excludeJobId) statement = statement.neq("id", input.excludeJobId);
    const { data, error } = await statement.limit(10);
    if (error) throw error;
    return this.hydrateJobs(data || []);
  }

  private mapCandidateProfile(row: any): CandidateProfile {
    return candidateProfileSchema.parse({
      id: row.id,
      userId: row.user_id,
      marketCode: row.market_code,
      professionalTitle: row.professional_title || undefined,
      summary: row.summary || undefined,
      skillIds: row.skill_ids || [],
      experiences: row.experiences || [],
      education: row.education || [],
      certifications: row.certifications || [],
      languages: row.languages || [],
      desiredProfessionIds: row.desired_profession_ids || [],
      desiredContractTypeIds: row.desired_contract_type_ids || [],
      preferredLocationIds: row.preferred_location_ids || [],
      remotePreferenceId: row.remote_preference_id || undefined,
      salaryExpectation: row.salary_expectation || undefined,
      availabilityDate: row.availability_date || undefined,
      professionalLinks: row.professional_links || [],
      visibility: row.visibility,
      recruiterSearchConsentId: row.recruiter_search_consent_id || undefined,
      updatedAt: row.updated_at,
    });
  }

  private mapApplication(row: any): EmploymentApplication {
    return applicationSchema.parse({
      id: row.id,
      jobId: row.job_id,
      candidateId: row.candidate_id,
      cvId: row.cv_document_id,
      coverMessage: row.cover_message || undefined,
      screeningAnswers: (row.answers || []).map((answer: any) => ({
        questionId: answer.question_id,
        answer: answer.answer,
      })),
      pipelineId: row.pipeline_id,
      stageId: row.stage_id,
      systemState: row.system_state,
      candidateVisibleStatus: row.candidate_visible_status,
      assignedRecruiterIds: (row.assignments || []).map(
        (assignment: any) => assignment.recruiter_user_id,
      ),
      privacyPolicyVersion: row.privacy_policy_version,
      consentRecordId: row.consent_record_id || undefined,
      submittedAt: row.submitted_at,
      updatedAt: row.updated_at,
      withdrawnAt: row.withdrawn_at || undefined,
      retentionExpiresAt: row.retention_expires_at,
    });
  }

  private applicationSelect() {
    return "*, answers:employment_screening_answers(*), assignments:employment_recruiter_assignments(*)";
  }

  override async getCandidateProfileForUser(userId: string) {
    const { data, error } = await this.db()
      .from("employment_candidate_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapCandidateProfile(data) : null;
  }

  override async getCandidateProfile(id: string) {
    const { data, error } = await this.db()
      .from("employment_candidate_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapCandidateProfile(data) : null;
  }

  override async saveCandidateProfile(profile: CandidateProfile) {
    const parsed = candidateProfileSchema.parse(profile);
    const { data, error } = await this.db()
      .from("employment_candidate_profiles")
      .upsert({
        id: parsed.id,
        user_id: parsed.userId,
        market_code: parsed.marketCode,
        professional_title: parsed.professionalTitle || null,
        summary: parsed.summary || null,
        skill_ids: parsed.skillIds,
        experiences: parsed.experiences,
        education: parsed.education,
        certifications: parsed.certifications,
        languages: parsed.languages,
        desired_profession_ids: parsed.desiredProfessionIds,
        desired_contract_type_ids: parsed.desiredContractTypeIds,
        preferred_location_ids: parsed.preferredLocationIds,
        remote_preference_id: parsed.remotePreferenceId || null,
        salary_expectation: parsed.salaryExpectation || null,
        availability_date: parsed.availabilityDate || null,
        professional_links: parsed.professionalLinks,
        visibility: parsed.visibility,
        recruiter_search_consent_id: parsed.recruiterSearchConsentId || null,
        updated_at: parsed.updatedAt,
      })
      .select("*")
      .single();
    if (error) throw error;
    return this.mapCandidateProfile(data);
  }

  override async getConsentRecord(id: string) {
    const { data, error } = await this.db()
      .from("employment_consent_records")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data
      ? consentRecordSchema.parse({
          id: data.id,
          subjectUserId: data.subject_user_id,
          purposeId: data.purpose_id,
          policyVersion: data.policy_version,
          status: data.status,
          grantedAt: data.granted_at,
          withdrawnAt: data.withdrawn_at || undefined,
          expiresAt: data.expires_at || undefined,
        })
      : null;
  }

  override async saveConsentRecord(consent: ConsentRecord) {
    const parsed = consentRecordSchema.parse(consent);
    const { data, error } = await this.db()
      .from("employment_consent_records")
      .upsert({
        id: parsed.id,
        subject_user_id: parsed.subjectUserId,
        purpose_id: parsed.purposeId,
        policy_version: parsed.policyVersion,
        status: parsed.status,
        granted_at: parsed.grantedAt,
        withdrawn_at: parsed.withdrawnAt || null,
        expires_at: parsed.expiresAt || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return consentRecordSchema.parse({
      id: data.id,
      subjectUserId: data.subject_user_id,
      purposeId: data.purpose_id,
      policyVersion: data.policy_version,
      status: data.status,
      grantedAt: data.granted_at,
      withdrawnAt: data.withdrawn_at || undefined,
      expiresAt: data.expires_at || undefined,
    });
  }

  override async getApplication(id: string) {
    const { data, error } = await this.db()
      .from("employment_applications")
      .select(this.applicationSelect())
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapApplication(data) : null;
  }

  override async findActiveApplication(jobId: string, candidateId: string) {
    const { data, error } = await this.db()
      .from("employment_applications")
      .select(this.applicationSelect())
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .not("system_state", "in", "(withdrawn,rejected,archived)")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapApplication(data) : null;
  }

  override async saveApplication(application: EmploymentApplication, expectedStageId?: string) {
    const parsed = applicationSchema.parse(application);
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let pipelineId = parsed.pipelineId;
    let stageId = parsed.stageId;
    if (!uuidPattern.test(pipelineId) || !uuidPattern.test(stageId)) {
      const job = await this.db()
        .from("employment_jobs")
        .select("employer_id")
        .eq("id", parsed.jobId)
        .single();
      if (job.error) throw job.error;
      const pipeline = await this.db()
        .from("employment_pipelines")
        .select("id")
        .eq("employer_id", job.data.employer_id)
        .eq("is_default", true)
        .single();
      if (pipeline.error) throw pipeline.error;
      const stage = await this.db()
        .from("employment_pipeline_stages")
        .select("id")
        .eq("pipeline_id", pipeline.data.id)
        .eq("system_state", parsed.systemState)
        .order("sort_order")
        .limit(1)
        .single();
      if (stage.error) throw stage.error;
      pipelineId = pipeline.data.id;
      stageId = stage.data.id;
    }
    const applicationRow = {
        id: parsed.id,
        job_id: parsed.jobId,
        candidate_id: parsed.candidateId,
        cv_document_id: parsed.cvId,
        cover_message: parsed.coverMessage || null,
        pipeline_id: pipelineId,
        stage_id: stageId,
        system_state: parsed.systemState,
        candidate_visible_status: parsed.candidateVisibleStatus,
        privacy_policy_version: parsed.privacyPolicyVersion,
        consent_record_id: parsed.consentRecordId || null,
        submitted_at: parsed.submittedAt,
        withdrawn_at: parsed.withdrawnAt || null,
        retention_expires_at: parsed.retentionExpiresAt,
        updated_at: parsed.updatedAt,
      };
    let persistence = this.db().from("employment_applications");
    const result = expectedStageId
      ? await persistence
          .update(applicationRow)
          .eq("id", parsed.id)
          .eq("stage_id", expectedStageId)
          .select("id")
      : await persistence.upsert(applicationRow).select("id");
    if (result.error) throw result.error;
    if (expectedStageId && !result.data?.length) throw new Error("EMPLOYMENT_STAGE_CONFLICT");
    const answerDelete = await this.db()
      .from("employment_screening_answers")
      .delete()
      .eq("application_id", parsed.id);
    if (answerDelete.error) throw answerDelete.error;
    if (parsed.screeningAnswers.length) {
      const answers = await this.db().from("employment_screening_answers").insert(
        parsed.screeningAnswers.map((answer) => ({
          application_id: parsed.id,
          question_id: answer.questionId,
          answer: answer.answer,
        })),
      );
      if (answers.error) throw answers.error;
    }
    const assignmentsDelete = await this.db()
      .from("employment_recruiter_assignments")
      .delete()
      .eq("application_id", parsed.id);
    if (assignmentsDelete.error) throw assignmentsDelete.error;
    if (parsed.assignedRecruiterIds.length) {
      const assignments = await this.db().from("employment_recruiter_assignments").insert(
        parsed.assignedRecruiterIds.map((recruiterId) => ({
          application_id: parsed.id,
          recruiter_user_id: recruiterId,
          assigned_by_user_id: recruiterId,
        })),
      );
      if (assignments.error) throw assignments.error;
    }
    const saved = await this.getApplication(parsed.id);
    if (!saved) throw new Error("La candidature enregistrée ne peut pas être relue.");
    return saved;
  }

  override async getCandidateWorkspace(userId: string) {
    const profile = await this.getCandidateProfileForUser(userId);
    if (!profile) return null;
    const [documents, savedRows, applications, consents, alerts] = await Promise.all([
      this.db().from("employment_candidate_documents").select("*").eq("candidate_id", profile.id).is("deleted_at", null).order("created_at", { ascending: false }).limit(50),
      this.db().from("employment_saved_jobs").select("job_id").eq("candidate_id", profile.id).order("created_at", { ascending: false }).limit(200),
      this.db().from("employment_applications").select(this.applicationSelect()).eq("candidate_id", profile.id).order("submitted_at", { ascending: false }).limit(500),
      this.db().from("employment_consent_records").select("*").eq("subject_user_id", userId).order("granted_at", { ascending: false }).limit(200),
      this.db().from("employment_job_alerts").select("*").eq("candidate_id", profile.id).order("created_at", { ascending: false }).limit(100),
    ]);
    for (const result of [documents, savedRows, applications, consents, alerts]) if (result.error) throw result.error;
    const savedIds = (savedRows.data || []).map((row: any) => row.job_id);
    let savedJobs: JobPostingDetail[] = [];
    if (savedIds.length) {
      const result = await this.db().from("employment_jobs").select(this.jobSelect()).in("id", savedIds);
      if (result.error) throw result.error;
      const hydrated = await this.hydrateJobs(result.data || []);
      const byId = new Map(hydrated.map((job) => [job.id, job]));
      savedJobs = savedIds.map((id: string) => byId.get(id)).filter((job: JobPostingDetail | undefined): job is JobPostingDetail => Boolean(job));
    }
    const mappedApplications: EmploymentApplication[] = (applications.data || []).map((row: any) => this.mapApplication(row));
    const applicationIds = mappedApplications.map((application: EmploymentApplication) => application.id);
    let interviews: EmploymentInterview[] = [];
    if (applicationIds.length) {
      const result = await this.db().from("employment_interviews").select("*").in("application_id", applicationIds).order("starts_at").limit(200);
      if (result.error) throw result.error;
      interviews = (result.data || []).map((row: any) => interviewSchema.parse({
        id: row.id,
        applicationId: row.application_id,
        modeId: row.mode,
        timezone: row.timezone,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status,
        locationLabel: row.location_label || undefined,
        privateMeetingLink: row.private_meeting_link || undefined,
        participantUserIds: row.participant_user_ids,
        candidateMessage: row.candidate_message || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }
    return {
      profile,
      cvs: (documents.data || []).filter((row: any) => row.document_type === "cv").map((row: any) => ({
        id: row.id,
        candidateId: row.candidate_id,
        label: row.label,
        fileName: row.file_name,
        mimeType: row.mime_type,
        malwareScanStatus: row.malware_scan_status,
        isDefault: row.is_default,
        createdAt: row.created_at,
      })),
      savedJobs: savedJobs.map((job) => ({ ...card(job), saved: true })),
      applications: mappedApplications.map(({ screeningAnswers: _answers, ...application }: EmploymentApplication) => application),
      interviews,
      consentHistory: (consents.data || []).map((row: any) => ({
        id: row.id,
        subjectUserId: row.subject_user_id,
        purposeId: row.purpose_id,
        policyVersion: row.policy_version,
        status: row.status,
        grantedAt: row.granted_at,
        withdrawnAt: row.withdrawn_at || undefined,
        expiresAt: row.expires_at || undefined,
      })),
      alerts: (alerts.data || []).map((row: any) => jobAlertSchema.parse({
        id: row.id,
        candidateId: row.candidate_id,
        label: row.name,
        query: row.query,
        frequency: row.frequency,
        enabled: row.enabled,
        lastSentAt: row.last_sent_at || undefined,
        createdAt: row.created_at,
      })),
    };
  }

  override async toggleSavedJob(candidateId: string, jobId: string) {
    const existing = await this.db()
      .from("employment_saved_jobs")
      .select("job_id")
      .eq("candidate_id", candidateId)
      .eq("job_id", jobId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      const removed = await this.db().from("employment_saved_jobs").delete().eq("candidate_id", candidateId).eq("job_id", jobId);
      if (removed.error) throw removed.error;
      return false;
    }
    const added = await this.db().from("employment_saved_jobs").insert({ candidate_id: candidateId, job_id: jobId });
    if (added.error) throw added.error;
    return true;
  }

  override async saveJobAlert(alert: JobAlert) {
    const parsed = jobAlertSchema.parse(alert);
    const { data, error } = await this.db().from("employment_job_alerts").upsert({
      id: parsed.id,
      candidate_id: parsed.candidateId,
      market_code: parsed.query.marketCode,
      name: parsed.label,
      query: parsed.query,
      frequency: parsed.frequency,
      enabled: parsed.enabled,
      last_sent_at: parsed.lastSentAt || null,
      updated_at: new Date().toISOString(),
    }).select("*").single();
    if (error) throw error;
    return jobAlertSchema.parse({
      id: data.id,
      candidateId: data.candidate_id,
      label: data.name,
      query: data.query,
      frequency: data.frequency,
      enabled: data.enabled,
      lastSentAt: data.last_sent_at || undefined,
      createdAt: data.created_at,
    });
  }

  override async deleteJobAlert(candidateId: string, alertId: string) {
    const { data, error } = await this.db()
      .from("employment_job_alerts")
      .delete()
      .eq("candidate_id", candidateId)
      .eq("id", alertId)
      .select("id");
    if (error) throw error;
    return Boolean(data?.length);
  }

  override async saveDataSubjectRequest(request: EmploymentDataSubjectRequest) {
    const parsed = employmentDataSubjectRequestSchema.parse(request);
    const { data, error } = await this.db().from("employment_data_subject_requests").upsert({
      id: parsed.id,
      subject_user_id: parsed.subjectUserId,
      request_type: parsed.requestType,
      status: parsed.status,
      requested_at: parsed.requestedAt,
      completed_at: parsed.completedAt || null,
    }).select("*").single();
    if (error) throw error;
    return employmentDataSubjectRequestSchema.parse({
      id: data.id,
      subjectUserId: data.subject_user_id,
      requestType: data.request_type,
      status: data.status,
      requestedAt: data.requested_at,
      completedAt: data.completed_at || undefined,
    });
  }

  override async getOpenDataSubjectRequest(userId: string, requestType: EmploymentDataSubjectRequest["requestType"]) {
    const { data, error } = await this.db()
      .from("employment_data_subject_requests")
      .select("*")
      .eq("subject_user_id", userId)
      .eq("request_type", requestType)
      .in("status", ["accepted", "processing"])
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? employmentDataSubjectRequestSchema.parse({
      id: data.id,
      subjectUserId: data.subject_user_id,
      requestType: data.request_type,
      status: data.status,
      requestedAt: data.requested_at,
      completedAt: data.completed_at || undefined,
    }) : null;
  }

  override async saveJobReport(report: EmploymentJobReport) {
    const parsed = employmentJobReportSchema.parse(report);
    const { data, error } = await this.db().from("employment_job_reports").upsert({
      id: parsed.id,
      job_id: parsed.jobId,
      reporter_user_id: parsed.reporterUserId,
      reason: parsed.reason,
      details: parsed.details || null,
      status: parsed.status,
      updated_at: new Date().toISOString(),
    }, { onConflict: "job_id,reporter_user_id,reason" }).select("*").single();
    if (error) throw error;
    return employmentJobReportSchema.parse({
      id: data.id,
      jobId: data.job_id,
      reporterUserId: data.reporter_user_id,
      reason: data.reason,
      details: data.details || undefined,
      status: data.status,
      createdAt: data.created_at,
    });
  }

  override async saveModerationFlags(jobId: string, flags: ProhibitedLanguageFlag[]) {
    const removed = await this.db().from("employment_moderation_flags").delete().eq("job_id", jobId).is("reviewed_at", null);
    if (removed.error) throw removed.error;
    if (!flags.length) return;
    const saved = await this.db().from("employment_moderation_flags").insert(
      flags.map((flag) => ({
        id: randomUUID(),
        job_id: jobId,
        field_name: flag.field,
        excerpt: flag.excerpt,
        policy_rule_id: flag.policyRuleId,
        explanation: flag.explanation,
        neutral_suggestion: flag.neutralSuggestion,
        requires_human_review: true,
        is_legal_decision: false,
      })),
    );
    if (saved.error) throw saved.error;
  }

  override async isRecruiterMember(userId: string, employerId: string) {
    const { count, error } = await this.db()
      .from("employment_recruiter_memberships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("employer_id", employerId)
      .eq("status", "active");
    if (error) throw error;
    return Boolean(count);
  }

  override async listRecruiterEmployers(userId: string) {
    const { data, error } = await this.db()
      .from("employment_recruiter_memberships")
      .select("employer:employment_employer_profiles(*)")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).flatMap((membership: any) => {
      const employer = Array.isArray(membership.employer)
        ? membership.employer[0]
        : membership.employer;
      if (!employer || employer.status !== "active") return [];
      return [{
        id: employer.id,
        organizationId: employer.organization_id || undefined,
        name: employer.display_name,
        slug: employer.slug,
        employerTypeId: employer.employer_type_id,
        description: employer.description || undefined,
        logoUrl: employer.logo_url || undefined,
        verificationLevel: employer.verification_level,
        isPubliclyVerified: ["domain_verified", "manually_verified", "provider_verified"].includes(
          employer.verification_level,
        ),
      } satisfies EmployerSummary];
    });
  }

  override async canManageApplications(userId: string, employerId: string) {
    const { data, error } = await this.db()
      .from("employment_recruiter_memberships")
      .select("role,permissions")
      .eq("user_id", userId)
      .eq("employer_id", employerId)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    return Boolean(
      data &&
        (["owner", "recruitment_admin", "recruiter", "hiring_manager"].includes(data.role) ||
          (data.permissions || []).includes("application.manage")),
    );
  }

  override async getRecruiterWorkspace(employerId: string) {
    const employerResult = await this.db()
      .from("employment_employer_profiles")
      .select("*")
      .eq("id", employerId)
      .maybeSingle();
    if (employerResult.error) throw employerResult.error;
    if (!employerResult.data) return null;
    const employerRow = employerResult.data;
    const jobsResult = await this.db()
      .from("employment_jobs")
      .select(this.jobSelect())
      .eq("employer_id", employerId)
      .order("updated_at", { ascending: false })
      .limit(500);
    if (jobsResult.error) throw jobsResult.error;
    const jobs = await this.hydrateJobs(jobsResult.data || []);
    const jobIds = jobs.map((job) => job.id);
    let applications: EmploymentApplication[] = [];
    if (jobIds.length) {
      const result = await this.db()
        .from("employment_applications")
        .select(this.applicationSelect())
        .in("job_id", jobIds)
        .order("updated_at", { ascending: false })
        .limit(1000);
      if (result.error) throw result.error;
      applications = (result.data || []).map((row: any) => this.mapApplication(row));
    }
    const applicationIds = applications.map((application) => application.id);
    const pipelineResult = await this.db()
      .from("employment_pipelines")
      .select("id")
      .eq("employer_id", employerId)
      .eq("is_default", true)
      .maybeSingle();
    if (pipelineResult.error) throw pipelineResult.error;
    let stages: ApplicationStage[] = [];
    if (pipelineResult.data) {
      const result = await this.db()
        .from("employment_pipeline_stages")
        .select("*")
        .eq("pipeline_id", pipelineResult.data.id)
        .order("sort_order");
      if (result.error) throw result.error;
      stages = (result.data || []).map((row: any) => ({
        id: row.id,
        pipelineId: row.pipeline_id,
        label: row.label,
        systemState: row.system_state,
        candidateVisibleLabel: row.candidate_visible_label,
        sortOrder: row.sort_order,
        candidateNotificationEnabled: row.candidate_notification_enabled,
        isRequiredSystemStage: row.is_required_system_stage,
      }));
    }
    let interviews: EmploymentInterview[] = [];
    let recruiterNotes: RecruiterNote[] = [];
    if (applicationIds.length) {
      const [interviewResult, noteResult] = await Promise.all([
        this.db().from("employment_interviews").select("*").in("application_id", applicationIds).order("starts_at").limit(500),
        this.db().from("employment_recruiter_notes").select("*").in("application_id", applicationIds).order("created_at", { ascending: false }).limit(1000),
      ]);
      if (interviewResult.error) throw interviewResult.error;
      if (noteResult.error) throw noteResult.error;
      interviews = (interviewResult.data || []).map((row: any) => interviewSchema.parse({
        id: row.id,
        applicationId: row.application_id,
        modeId: row.mode,
        timezone: row.timezone,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status,
        locationLabel: row.location_label || undefined,
        privateMeetingLink: row.private_meeting_link || undefined,
        participantUserIds: row.participant_user_ids,
        candidateMessage: row.candidate_message || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      recruiterNotes = (noteResult.data || []).map((row: any) => recruiterNoteSchema.parse({
        id: row.id,
        applicationId: row.application_id,
        authorUserId: row.author_user_id,
        body: row.body,
        visibility: "recruiters_only",
        createdAt: row.created_at,
      }));
    }
    const catalog = await this.getCatalog("FR");
    const free = catalog.offers.find((offer) => offer.id === "employment.employer.free")!;
    const imports = employerRow.organization_id
      ? await this.listImportsForOrganization(employerRow.organization_id)
      : [];
    const memberResult = await this.db()
      .from("employment_recruiter_memberships")
      .select("id,user_id,role,branch_ids,client_employer_ids,permissions,status")
      .eq("employer_id", employerId)
      .order("created_at", { ascending: true })
      .limit(250);
    if (memberResult.error) throw memberResult.error;
    return {
      employer: {
        id: employerRow.id,
        organizationId: employerRow.organization_id || undefined,
        name: employerRow.display_name,
        slug: employerRow.slug,
        employerTypeId: employerRow.employer_type_id,
        description: employerRow.description || undefined,
        logoUrl: employerRow.logo_url || undefined,
        websiteUrl: employerRow.website_url || undefined,
        verificationLevel: employerRow.verification_level,
        isPubliclyVerified: ["domain_verified", "manually_verified", "provider_verified"].includes(employerRow.verification_level),
      },
      jobs: jobs.map(card),
      applications,
      stages,
      interviews,
      recruiterNotes,
      imports,
      members: (memberResult.data || []).map((member: any) => ({
        id: member.id,
        userId: member.user_id,
        role: member.role,
        branchIds: member.branch_ids || [],
        clientEmployerIds: member.client_employer_ids || [],
        permissions: member.permissions || [],
        status: member.status,
      })),
      activeOfferId: free.id,
      entitlements: free.entitlements,
    };
  }

  override async saveApplicationEvent(event: ApplicationEvent) {
    const parsed = applicationEventSchema.parse(event);
    const { data, error } = await this.db().from("employment_application_events").insert({
      id: parsed.id,
      application_id: parsed.applicationId,
      actor_user_id: parsed.actorUserId || null,
      event_type: parsed.eventType,
      previous_stage_id: parsed.previousStageId || null,
      next_stage_id: parsed.nextStageId || null,
      reason: parsed.reason || null,
      candidate_notified: parsed.candidateNotified,
      metadata: {},
      occurred_at: parsed.occurredAt,
    }).select("*").single();
    if (error) throw error;
    return applicationEventSchema.parse({
      id: data.id,
      applicationId: data.application_id,
      actorUserId: data.actor_user_id || undefined,
      eventType: data.event_type,
      previousStageId: data.previous_stage_id || undefined,
      nextStageId: data.next_stage_id || undefined,
      reason: data.reason || undefined,
      candidateNotified: data.candidate_notified,
      occurredAt: data.occurred_at,
    });
  }

  override async saveRecruiterNote(note: RecruiterNote) {
    const parsed = recruiterNoteSchema.parse(note);
    const { data, error } = await this.db().from("employment_recruiter_notes").insert({
      id: parsed.id,
      application_id: parsed.applicationId,
      author_user_id: parsed.authorUserId,
      body: parsed.body,
      visibility: "recruiters_only",
    }).select("*").single();
    if (error) throw error;
    return recruiterNoteSchema.parse({
      id: data.id,
      applicationId: data.application_id,
      authorUserId: data.author_user_id,
      body: data.body,
      visibility: "recruiters_only",
      createdAt: data.created_at,
    });
  }

  override async getInterview(id: string) {
    const { data, error } = await this.db()
      .from("employment_interviews")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? interviewSchema.parse({
      id: data.id,
      applicationId: data.application_id,
      modeId: data.mode,
      timezone: data.timezone,
      startsAt: data.starts_at,
      endsAt: data.ends_at,
      status: data.status,
      locationLabel: data.location_label || undefined,
      privateMeetingLink: data.private_meeting_link || undefined,
      participantUserIds: data.participant_user_ids,
      candidateMessage: data.candidate_message || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }) : null;
  }

  override async saveInterview(interview: EmploymentInterview, actorUserId?: string) {
    const parsed = interviewSchema.parse(interview);
    if (!actorUserId) throw new Error("Un auteur est requis pour planifier un entretien.");
    const { data, error } = await this.db().from("employment_interviews").upsert({
      id: parsed.id,
      application_id: parsed.applicationId,
      mode: parsed.modeId,
      timezone: parsed.timezone,
      starts_at: parsed.startsAt,
      ends_at: parsed.endsAt,
      status: parsed.status,
      location_label: parsed.locationLabel || null,
      private_meeting_link: parsed.privateMeetingLink || null,
      participant_user_ids: parsed.participantUserIds,
      candidate_message: parsed.candidateMessage || null,
      created_by_user_id: actorUserId,
      updated_at: parsed.updatedAt,
    }).select("*").single();
    if (error) throw error;
    return interviewSchema.parse({
      id: data.id,
      applicationId: data.application_id,
      modeId: data.mode,
      timezone: data.timezone,
      startsAt: data.starts_at,
      endsAt: data.ends_at,
      status: data.status,
      locationLabel: data.location_label || undefined,
      privateMeetingLink: data.private_meeting_link || undefined,
      participantUserIds: data.participant_user_ids,
      candidateMessage: data.candidate_message || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  }

  private async listImportsForOrganization(organizationId: string, limit = 200): Promise<EmploymentImport[]> {
    const employers = await this.db()
      .from("employment_employer_profiles")
      .select("id")
      .eq("organization_id", organizationId)
      .limit(500);
    if (employers.error) throw employers.error;
    const employerIds = (employers.data || []).map((row: any) => row.id);
    if (!employerIds.length) return [];
    const sources = await this.db()
      .from("employment_import_sources")
      .select("id,source_type,source_identifier")
      .in("employer_id", employerIds)
      .limit(500);
    if (sources.error) throw sources.error;
    const sourceIds = (sources.data || []).map((row: any) => row.id);
    if (!sourceIds.length) return [];
    const logs = await this.db()
      .from("employment_sync_logs")
      .select("*")
      .in("source_id", sourceIds)
      .order("started_at", { ascending: false })
      .limit(limit);
    if (logs.error) throw logs.error;
    const bySource = new Map((sources.data || []).map((row: any) => [row.id, row]));
    return (logs.data || []).map((row: any) => {
      const source = bySource.get(row.source_id) as any;
      return employmentImportSchema.parse({
        id: row.id,
        organizationId,
        sourceType: source.source_type,
        sourceIdentifier: source.source_identifier,
        idempotencyKey: row.idempotency_key,
        status: row.status,
        createdCount: row.created_count,
        updatedCount: row.updated_count,
        expiredCount: row.expired_count,
        duplicateCount: row.duplicate_count,
        errorCount: row.error_count,
        createdAt: row.started_at,
        completedAt: row.completed_at || undefined,
      });
    });
  }

  override async getImportByIdempotency(organizationId: string, key: string) {
    const imports = await this.listImportsForOrganization(organizationId, 500);
    return imports.find((item) => item.idempotencyKey === key) || null;
  }

  override async saveImport(job: EmploymentImport, actorUserId?: string) {
    const parsed = employmentImportSchema.parse(job);
    if (!actorUserId) throw new Error("Un auteur est requis pour créer un import Emploi.");
    const employer = await this.db()
      .from("employment_employer_profiles")
      .select("id")
      .eq("organization_id", parsed.organizationId)
      .eq("status", "active")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (employer.error) throw employer.error;
    if (!employer.data) throw new Error("Employeur Emploi introuvable pour cet import.");
    const source = await this.db()
      .from("employment_import_sources")
      .upsert(
        {
          employer_id: employer.data.id,
          source_type: parsed.sourceType,
          name: parsed.sourceIdentifier,
          source_identifier: parsed.sourceIdentifier,
          mapping: {},
          rate_limit_per_hour: 60,
          is_active: true,
          created_by_user_id: actorUserId,
        },
        { onConflict: "employer_id,source_identifier" },
      )
      .select("id")
      .single();
    if (source.error) throw source.error;
    const log = await this.db().from("employment_sync_logs").upsert({
      id: parsed.id,
      source_id: source.data.id,
      idempotency_key: parsed.idempotencyKey,
      payload_hash: createHash("sha256").update(`${parsed.sourceType}:${parsed.sourceIdentifier}:${parsed.idempotencyKey}`).digest("hex"),
      status: parsed.status,
      created_count: parsed.createdCount,
      updated_count: parsed.updatedCount,
      expired_count: parsed.expiredCount,
      duplicate_count: parsed.duplicateCount,
      error_count: parsed.errorCount,
      started_at: parsed.createdAt,
      completed_at: parsed.completedAt || null,
    }, { onConflict: "source_id,idempotency_key" });
    if (log.error) throw log.error;
    const saved = await this.getImportByIdempotency(parsed.organizationId, parsed.idempotencyKey);
    if (!saved) throw new Error("L’import Emploi enregistré ne peut pas être relu.");
    return saved;
  }

  override async getAdminOverview(marketCode: string): Promise<EmploymentAdminOverview> {
    const code = marketCode.toUpperCase();
    const count = async (table: string, configure?: (statement: any) => any) => {
      let statement = this.db().from(table).select("id", { count: "exact", head: true });
      if (configure) statement = configure(statement);
      const result = await statement;
      if (result.error) throw result.error;
      return result.count || 0;
    };
    const [
      employersActive,
      employersVerified,
      employersSuspended,
      employersPrivate,
      jobsPublished,
      jobsPending,
      jobsExpired,
      jobsFlagged,
      applicationsReceived,
      applicationsInterview,
      applicationsOffer,
      applicationsHired,
      moderationQueueCount,
      prohibitedLanguageReviewCount,
      importLogs,
    ] = await Promise.all([
      count("employment_employer_profiles", (query) => query.eq("status", "active")),
      count("employment_employer_profiles", (query) => query.in("verification_level", ["domain_verified", "manually_verified", "provider_verified"])),
      count("employment_employer_profiles", (query) => query.eq("status", "suspended")),
      count("employment_employer_profiles", (query) => query.eq("employer_type_id", "employment.fr.employer_type.private")),
      count("employment_jobs", (query) => query.eq("market_code", code).eq("lifecycle", "published")),
      count("employment_jobs", (query) => query.eq("market_code", code).eq("lifecycle", "pending_review")),
      count("employment_jobs", (query) => query.eq("market_code", code).eq("lifecycle", "expired")),
      count("employment_jobs", (query) => query.eq("market_code", code).eq("moderation_status", "flagged")),
      count("employment_applications", (query) => query.eq("system_state", "received")),
      count("employment_applications", (query) => query.eq("system_state", "interview")),
      count("employment_applications", (query) => query.eq("system_state", "offer")),
      count("employment_applications", (query) => query.eq("system_state", "hired")),
      count("employment_jobs", (query) => query.eq("market_code", code).eq("moderation_status", "pending")),
      count("employment_moderation_flags", (query) => query.is("resolution", null)),
      this.db().from("employment_sync_logs").select("error_count").gt("error_count", 0).limit(1000),
    ]);
    if (importLogs.error) throw importLogs.error;
    return {
      catalog: await this.getCatalog(code, true),
      employerCounts: {
        active: employersActive,
        verified: employersVerified,
        suspended: employersSuspended,
        private: employersPrivate,
      },
      jobCounts: {
        published: jobsPublished,
        pending_review: jobsPending,
        expired: jobsExpired,
        flagged: jobsFlagged,
      },
      applicationCounts: {
        received: applicationsReceived,
        interview: applicationsInterview,
        offer: applicationsOffer,
        hired: applicationsHired,
      },
      importErrorCount: (importLogs.data || []).reduce(
        (sum: number, row: any) => sum + row.error_count,
        0,
      ),
      moderationQueueCount,
      prohibitedLanguageReviewCount,
    };
  }

  override async updateMarketConfig(
    marketCode: string,
    patch: Partial<EmploymentMarketConfig>,
    actorUserId?: string,
  ) {
    if (!actorUserId) throw new Error("Un administrateur est requis pour modifier Shongre Emploi.");
    const before = (await this.getCatalog(marketCode, true)).config;
    const snake: Record<string, unknown> = { updated_by: actorUserId, updated_at: new Date().toISOString() };
    const mappings: Array<[keyof EmploymentMarketConfig, string]> = [
      ["schemaVersion", "schema_version"],
      ["locale", "locale"],
      ["currency", "currency"],
      ["timezone", "timezone"],
      ["isEnabled", "is_enabled"],
      ["defaultPublicationDurationDays", "default_publication_duration_days"],
      ["draftRetentionDays", "draft_retention_days"],
      ["applicationRetentionDays", "application_retention_days"],
      ["talentPoolRetentionDays", "talent_pool_retention_days"],
      ["applicationResubmissionCooldownDays", "application_resubmission_cooldown_days"],
      ["regulatoryContentVersion", "regulatory_content_version"],
      ["prohibitedLanguagePolicyVersion", "prohibited_language_policy_version"],
      ["prohibitedLanguageRules", "prohibited_language_rules"],
      ["riskRules", "risk_rules"],
      ["requiredFieldIds", "required_field_ids"],
      ["featureFlags", "feature_flags"],
    ];
    for (const [contractKey, column] of mappings) {
      if (patch[contractKey] !== undefined) snake[column] = patch[contractKey];
    }
    const update = await this.db().from("employment_market_configs").update(snake).eq("market_code", marketCode);
    if (update.error) throw update.error;
    if (patch.isEnabled !== undefined) {
      const activation = await this.db().from("vertical_market_activations").update({ is_active: patch.isEnabled, updated_at: new Date().toISOString() }).eq("vertical_type", "employment").eq("market_code", marketCode);
      if (activation.error) throw activation.error;
    }
    const after = (await this.getCatalog(marketCode, true)).config;
    const audit = await this.db().from("employment_audit_logs").insert({
      actor_user_id: actorUserId,
      action: "employment.market_config.updated",
      target_type: "employment_market_config",
      target_id: marketCode,
      before_value: before,
      after_value: after,
    });
    if (audit.error) throw audit.error;
    return after;
  }

  override async updateOffer(
    offerId: string,
    patch: Partial<EmploymentCatalog["offers"][number]>,
    actorUserId?: string,
  ) {
    if (!actorUserId) throw new Error("Un administrateur est requis pour modifier une offre Emploi.");
    const catalog = await this.getCatalog(patch.marketCode || "FR", true);
    const before = catalog.offers.find((offer) => offer.id === offerId);
    if (!before) throw new Error("Offre Emploi introuvable.");
    const marketCode = patch.marketCode || before.marketCode;
    const base = await this.db().from("vertical_offers").update({
      audience: patch.audience ?? before.audience,
      kind: patch.kind ?? before.kind,
      name: patch.name ?? before.name,
      description: patch.description ?? before.description,
      is_active: patch.isActive ?? before.isActive,
      is_recommended: patch.isRecommended ?? before.isRecommended,
      sort_order: patch.sortOrder ?? before.sortOrder,
      updated_at: new Date().toISOString(),
    }).eq("id", offerId).eq("vertical_type", "employment").eq("market_code", marketCode);
    if (base.error) throw base.error;
    if (patch.prices) {
      const prices = await this.db().from("vertical_offer_prices").upsert(
        patch.prices.map((price) => ({
          id: price.id,
          offer_id: offerId,
          vertical_type: "employment",
          market_code: marketCode,
          amount_minor: price.amount.amountMinor,
          currency: price.amount.currency,
          billing_period: price.billingPeriod,
          duration_days: price.durationDays || null,
          trial_days: price.trialDays ?? null,
          tax_rate_bps: price.taxRateBps,
          is_active: price.isActive,
          updated_at: new Date().toISOString(),
        })),
      );
      if (prices.error) throw prices.error;
    }
    if (patch.entitlements) {
      const entitlements = await this.db().from("vertical_offer_entitlements").upsert(
        Object.entries(patch.entitlements).map(([key, value]) => ({
          offer_id: offerId,
          vertical_type: "employment",
          market_code: marketCode,
          entitlement_key: key,
          entitlement_value: value,
          updated_at: new Date().toISOString(),
        })),
      );
      if (entitlements.error) throw entitlements.error;
    }
    const after = (await this.getCatalog(marketCode, true)).offers.find((offer) => offer.id === offerId)!;
    const audit = await this.db().from("employment_audit_logs").insert({
      actor_user_id: actorUserId,
      action: "employment.offer.updated",
      target_type: "vertical_offer",
      target_id: offerId,
      before_value: before,
      after_value: after,
    });
    if (audit.error) throw audit.error;
    return after;
  }

  override async trackAnalyticsEvent(event: EmploymentAnalyticsEvent) {
    const dimensions = { ...(event.dimensions || {}) };
    for (const key of ["candidateName", "candidateEmail", "cvUrl", "coverMessage", "screeningAnswers", "protectedCharacteristic", "protectedCharacteristics"]) delete dimensions[key];
    const result = await this.db().from("employment_analytics_events").insert({
      event_name: event.eventName,
      market_code: event.marketCode,
      job_id: event.jobId || null,
      employer_id: event.employerId || null,
      anonymous_session_hash: event.anonymousSessionHash || null,
      dimensions,
      occurred_at: event.occurredAt || new Date().toISOString(),
    });
    if (result.error) throw result.error;
  }

  override async getEmployerStatus(employerId: string) {
    const { data, error } = await this.db()
      .from("employment_employer_profiles")
      .select("status")
      .eq("id", employerId)
      .maybeSingle();
    if (error) throw error;
    return data?.status || null;
  }

  override async createPrivateEmployer(userId: string, employer: EmployerSummary): Promise<EmployerSummary> {
    const { data, error } = await this.db()
      .from("employment_employer_profiles")
      .insert({
        id: employer.id,
        owner_user_id: userId,
        employer_type_id: employer.employerTypeId,
        slug: employer.slug,
        display_name: employer.name,
        description: employer.description || null,
        verification_level: "self_declared",
        verification_evidence: {},
        status: "active",
      })
      .select("*")
      .single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.display_name,
      slug: data.slug,
      employerTypeId: data.employer_type_id,
      description: data.description || undefined,
      verificationLevel: "self_declared" as const,
      isPubliclyVerified: false,
    };
  }

  override async getCatalog(marketCode: string, includeInactive = false) {
    const code = marketCode.toUpperCase();
    const [activation, config, dictionaries, defaultStages, offers, prices, entitlements, addOns] = await Promise.all([
      this.db().from("vertical_market_activations").select("*").eq("vertical_type", "employment").eq("market_code", code).maybeSingle(),
      this.db().from("employment_market_configs").select("*").eq("market_code", code).maybeSingle(),
      this.db().from("employment_dictionary_entries").select("*").eq("market_code", code).order("sort_order"),
      this.db().from("employment_default_pipeline_stages").select("*").eq("market_code", code).order("sort_order"),
      this.db().from("vertical_offers").select("*").eq("vertical_type", "employment").eq("market_code", code).order("sort_order"),
      this.db().from("vertical_offer_prices").select("*").eq("vertical_type", "employment").eq("market_code", code),
      this.db().from("vertical_offer_entitlements").select("*").eq("vertical_type", "employment").eq("market_code", code),
      this.db().from("vertical_add_ons").select("*").eq("vertical_type", "employment").eq("market_code", code).order("sort_order"),
    ]);
    for (const result of [activation, config, dictionaries, defaultStages, offers, prices, entitlements, addOns]) if (result.error) throw result.error;
    if (!activation.data || !config.data)
      throw new Error(`Configuration Shongre Emploi absente pour le marché ${code}.`);
    const catalog = employmentCatalogSchema.parse({
      activation: {
        marketCode: activation.data.market_code,
        verticalType: "employment",
        categoryIds: activation.data.category_ids,
        subcategoryIds: activation.data.subcategory_ids,
        schemaVersion: activation.data.schema_version,
        isActive: activation.data.is_active,
        featureFlags: activation.data.feature_flags,
      },
      config: {
        marketCode: config.data.market_code,
        schemaVersion: config.data.schema_version,
        locale: config.data.locale,
        currency: config.data.currency,
        timezone: config.data.timezone,
        isEnabled: config.data.is_enabled,
        defaultPublicationDurationDays: config.data.default_publication_duration_days,
        draftRetentionDays: config.data.draft_retention_days,
        applicationRetentionDays: config.data.application_retention_days,
        talentPoolRetentionDays: config.data.talent_pool_retention_days,
        applicationResubmissionCooldownDays: config.data.application_resubmission_cooldown_days,
        regulatoryContentVersion: config.data.regulatory_content_version,
        prohibitedLanguagePolicyVersion: config.data.prohibited_language_policy_version,
        prohibitedLanguageRules: config.data.prohibited_language_rules,
        riskRules: config.data.risk_rules,
        requiredFieldIds: config.data.required_field_ids,
        featureFlags: config.data.feature_flags,
      },
      dictionaries: (dictionaries.data || []).map((row: any) => ({
        id: row.id, marketCode: row.market_code, kind: row.kind,
        parentId: row.parent_id || undefined, code: row.code, slug: row.slug,
        label: row.label, description: row.description || undefined,
        aliases: row.aliases, metadata: row.metadata, isActive: row.is_active,
        sortOrder: row.sort_order, version: row.version,
      })),
      defaultPipelineStages: (defaultStages.data || []).map((row: any) => ({
        id: `employment.stage.${row.code}`,
        pipelineId: `employment.pipeline.default.${code.toLowerCase()}`,
        label: row.label,
        systemState: row.system_state,
        candidateVisibleLabel: row.candidate_visible_label,
        sortOrder: row.sort_order,
        candidateNotificationEnabled: row.candidate_notification_enabled,
        isRequiredSystemStage: row.is_required_system_stage,
      })),
      offers: (offers.data || []).map((row: any) => ({
        id: row.id, verticalType: "employment", marketCode: row.market_code,
        audience: row.audience, kind: row.kind, name: row.name, description: row.description,
        prices: (prices.data || []).filter((price: any) => price.offer_id === row.id).map((price: any) => ({
          id: price.id, amount: { amountMinor: Number(price.amount_minor), currency: price.currency },
          billingPeriod: price.billing_period, durationDays: price.duration_days || undefined,
          trialDays: price.trial_days ?? undefined, taxRateBps: price.tax_rate_bps, isActive: price.is_active,
        })),
        entitlements: Object.fromEntries((entitlements.data || []).filter((entry: any) => entry.offer_id === row.id).map((entry: any) => [entry.entitlement_key, parseEntitlementValue(entry.entitlement_value)])),
        isActive: row.is_active, isRecommended: row.is_recommended, sortOrder: row.sort_order,
      })),
      addOns: (addOns.data || []).map((row: any) => ({
        id: row.id, verticalType: "employment", marketCode: row.market_code,
        categoryIds: row.category_ids, geographicAreaIds: row.geographic_area_ids,
        type: row.type, name: row.name, description: row.description,
        price: { amountMinor: Number(row.amount_minor), currency: row.currency },
        taxRateBps: row.tax_rate_bps, validityDays: row.validity_days || undefined,
        creditQuantity: row.credit_quantity || undefined, scheduleModes: row.schedule_modes,
        isActive: row.is_active, sortOrder: row.sort_order,
      })),
      complianceNotices: DEFAULT_EMPLOYMENT_CATALOG.complianceNotices,
    });
    if (includeInactive) return catalog;
    return {
      ...catalog,
      dictionaries: catalog.dictionaries.filter((entry) => entry.isActive),
      offers: catalog.offers.filter((offer) => offer.isActive),
      addOns: catalog.addOns.filter((addOn) => addOn.isActive),
    };
  }
}

export const employmentRepository = new DemoEmploymentRepository();
